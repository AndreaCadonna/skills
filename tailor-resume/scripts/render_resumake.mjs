#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { normalizeResume, readResume, validateResume } from "./validate_resume.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const VENDOR_DIR = path.resolve(SCRIPT_DIR, "../assets/resumake-v2");
const TEMPLATE_ENGINES = Object.freeze({
  1: "pdflatex",
  2: "xelatex",
  3: "pdflatex",
  4: "xelatex",
  5: "xelatex",
  6: "xelatex",
  7: "pdflatex",
  8: "xelatex",
  9: "pdflatex",
});

function parseArgs(argv) {
  const opts = { texOnly: false, overwrite: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--tex-only") opts.texOnly = true;
    else if (arg === "--overwrite") opts.overwrite = true;
    else if (["--input", "--output-dir", "--basename", "--template"].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("Missing value for " + arg);
      opts[arg.slice(2).replace("-d", "D")] = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else {
      throw new Error("Unknown argument: " + arg);
    }
  }
  return opts;
}

function usage() {
  return [
    "Usage: node render_resumake.mjs --input resume.json --output-dir DIR --basename NAME [options]",
    "",
    "Options:",
    "  --template 1..9  Override selectedTemplate from the JSON input",
    "  --tex-only       Generate the source bundle without compiling PDF",
    "  --overwrite      Replace the exact existing output bundle",
  ].join("\n");
}

function safeBasename(value) {
  const name = String(value || "resume")
    .trim()
    .replace(/[<>:\"/\\|?*\x00-\x1f]/g, "-")
    .replace(/[. ]+$/g, "")
    .replace(/\s+/g, "-");
  if (!name || name === "." || name === "..") throw new Error("Invalid basename.");
  return name.slice(0, 100);
}

function escapeLatex(value) {
  const replacements = {
    "\\": "\\textbackslash{}",
    "{": "\\{",
    "}": "\\}",
    "#": "\\#",
    "$": "\\$",
    "%": "\\%",
    "&": "\\&",
    "_": "\\_",
    "^": "\\textasciicircum{}",
    "~": "\\textasciitilde{}",
  };
  return String(value).replace(/[\\{}#$%&_^~]/g, (character) => replacements[character]);
}

function escapeTree(value) {
  if (typeof value === "string") return escapeLatex(value);
  if (Array.isArray(value)) return value.map(escapeTree);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, escapeTree(item)]));
  }
  return value;
}

function toResumakeValues(input) {
  const normalized = normalizeResume(input);
  const websites = normalized.basics.website.split(/\s+/).filter(Boolean);
  const primaryWebsite = websites[0] || normalized.basics.profiles.find((profile) => profile.url)?.url || "";
  const sections = [];
  for (const section of normalized.sections) {
    const upstreamSection = section === "summary" ? "awards" : section;
    if (!sections.includes(upstreamSection)) sections.push(upstreamSection);
  }

  const awards = [...normalized.awards];
  if (normalized.summary) awards.unshift({ summary: normalized.summary });
  const includesSummary = normalized.sections.includes("summary");
  const headings = {
    ...normalized.headings,
    awards: includesSummary
      ? normalized.headings.summary || "Profile"
      : normalized.headings.awards || "Awards",
  };

  return escapeTree({
    ...normalized,
    basics: { ...normalized.basics, website: primaryWebsite },
    headings,
    sections,
    awards,
    work: normalized.work.map((job) => ({ ...job, name: job.company })),
  });
}

async function loadGenerator(template) {
  const sourcePath = path.join(VENDOR_DIR, "generators", `template${template}.ts`);
  let code = await fs.readFile(sourcePath, "utf8");
  code = code
    .replace(/^import[^\n]*\r?\n/gm, "")
    .replace(/const generator:\s*Generator\s*=/, "const generator =")
    .replace(/const generator:\s*Omit<Generator,\s*'resumeHeader'>\s*=/, "const generator =")
    .replace(new RegExp(`function template${template}\\(values: FormValues\\)`), `function template${template}(values)`)
    .replace(new RegExp(`export default template${template}\\s*$`), "");

  const require = createRequire(import.meta.url);
  const commonTags = require(path.join(VENDOR_DIR, "common-tags", "common-tags.min.cjs"));
  const factory = new Function(
    "stripIndent",
    "source",
    "WHITESPACE",
    `${code}\nreturn template${template};\n//# sourceURL=resumake-template${template}.js`,
  );
  return factory(commonTags.stripIndent, commonTags.source, "\\ ");
}

async function copyTemplateAssets(template, bundleDir) {
  const assetDir = path.join(VENDOR_DIR, "templates", `template${template}`);
  try {
    const entries = await fs.readdir(assetDir, { withFileTypes: true });
    for (const entry of entries) {
      await fs.cp(
        path.join(assetDir, entry.name),
        path.join(bundleDir, entry.name),
        { recursive: true, force: true },
      );
    }
  } catch (cause) {
    if (cause.code !== "ENOENT") throw cause;
  }
}

async function prepareBundle(outputDir, basename, overwrite) {
  const resolvedOutput = path.resolve(outputDir);
  const bundleDir = path.resolve(resolvedOutput, basename);
  if (path.dirname(bundleDir) !== resolvedOutput) throw new Error("Output bundle escaped its destination.");

  try {
    await fs.access(bundleDir);
    if (!overwrite) throw new Error("Output bundle already exists: " + bundleDir);
    await fs.rm(bundleDir, { recursive: true, force: true });
  } catch (cause) {
    if (cause.code !== "ENOENT") throw cause;
  }
  await fs.mkdir(bundleDir, { recursive: true });
  return bundleDir;
}

function compilePdf(engine, bundleDir) {
  const args = [
    "-no-shell-escape",
    "-interaction=nonstopmode",
    "-halt-on-error",
    "resume.tex",
  ];
  const logs = [];
  for (let pass = 1; pass <= 2; pass += 1) {
    const result = spawnSync(engine, args, {
      cwd: bundleDir,
      encoding: "utf8",
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 20 * 1024 * 1024,
    });
    logs.push(`=== ${engine} pass ${pass} ===\n${result.stdout || ""}${result.stderr || ""}`);
    if (result.error) {
      return { ok: false, logs, message: `${engine} could not be started: ${result.error.message}` };
    }
    if (result.status !== 0) {
      return { ok: false, logs, message: `${engine} failed with exit code ${result.status}.` };
    }
  }
  return { ok: true, logs };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(usage());
    return;
  }
  if (!opts.input || !opts.outputDir || !opts.basename) throw new Error(usage());

  const raw = await readResume(path.resolve(opts.input));
  if (opts.template !== undefined) raw.selectedTemplate = Number(opts.template);
  const report = validateResume(raw);
  if (!report.valid) {
    throw new Error("Resume validation failed:\n" + JSON.stringify(report.errors, null, 2));
  }

  const template = report.normalized.selectedTemplate;
  const engine = TEMPLATE_ENGINES[template];
  const generator = await loadGenerator(template);
  const tex = generator(toResumakeValues(report.normalized));
  const bundleDir = await prepareBundle(opts.outputDir, safeBasename(opts.basename), opts.overwrite);

  await copyTemplateAssets(template, bundleDir);
  await fs.copyFile(path.join(VENDOR_DIR, "LICENSE"), path.join(bundleDir, "LICENSE-RESUMAKE"));
  await fs.copyFile(path.join(VENDOR_DIR, "PROVENANCE.md"), path.join(bundleDir, "TEMPLATE-PROVENANCE.md"));
  await fs.copyFile(path.join(VENDOR_DIR, "THIRD_PARTY_NOTICES.md"), path.join(bundleDir, "THIRD_PARTY_NOTICES.md"));
  await fs.cp(path.join(VENDOR_DIR, "licenses"), path.join(bundleDir, "licenses"), { recursive: true });
  await fs.writeFile(path.join(bundleDir, "resume.json"), JSON.stringify(report.normalized, null, 2) + "\n", "utf8");
  await fs.writeFile(path.join(bundleDir, "resume.tex"), tex + "\n", "utf8");
  await fs.writeFile(
    path.join(bundleDir, "README.md"),
    `# Resumake v2 template ${template}\n\nGenerated from the vendored Resumake v2 generator.\n\nCompile with:\n\n    ${engine} -no-shell-escape resume.tex\n\nSee TEMPLATE-PROVENANCE.md, THIRD_PARTY_NOTICES.md, LICENSE-RESUMAKE, and licenses/ for licensing and attribution.\n`,
    "utf8",
  );

  let pdfPath = null;
  if (!opts.texOnly) {
    const result = compilePdf(engine, bundleDir);
    await fs.writeFile(path.join(bundleDir, "build.log"), result.logs.join("\n\n"), "utf8");
    if (!result.ok) {
      throw new Error(`${result.message}\nThe complete source bundle remains at ${bundleDir}. See build.log.`);
    }
    pdfPath = path.join(bundleDir, "resume.pdf");
    await fs.access(pdfPath);
  }

  console.log(JSON.stringify({
    template,
    engine,
    bundleDir,
    texPath: path.join(bundleDir, "resume.tex"),
    pdfPath,
    warnings: report.warnings,
  }, null, 2));
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    await main();
  } catch (cause) {
    console.error(cause.message);
    process.exitCode = 1;
  }
}
