#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  readResume,
  sanitizeDocumentBasename,
  validateResume,
} from "./validate_resume.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = "pdflatex";

function parseArgs(argv) {
  const opts = { texOnly: false, overwrite: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--tex-only") opts.texOnly = true;
    else if (arg === "--overwrite") opts.overwrite = true;
    else if (["--input", "--output-dir", "--basename"].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      opts[arg.slice(2).replace("-d", "D")] = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") opts.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return opts;
}

function usage() {
  return [
    "Usage: node render_ats_resume.mjs --input resume.json --output-dir DIR --basename BUNDLE [options]",
    "",
    "Options:",
    "  --tex-only   Generate the ATS TeX bundle without compiling PDF",
    "  --overwrite  Replace the exact existing output bundle",
  ].join("\n");
}

function safeBundleBasename(value) {
  const name = String(value || "resume")
    .trim()
    .replace(/[<>:\"/\\|?*\x00-\x1f]/g, "-")
    .replace(/[. ]+$/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 100);
  if (!name || name === "." || name === "..") throw new Error("Invalid bundle basename.");
  return name;
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

function urlValue(value) {
  return String(value).replace(/[{}]/g, (character) => encodeURIComponent(character));
}

function visibleUrl(url) {
  return `\\url{${urlValue(url)}}`;
}

function compactUrlText(url) {
  return String(url)
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

function dateRange(row) {
  const start = row.startDate || "";
  const end = row.endDate || (start ? "Present" : "");
  return [start, end].filter(Boolean).join(" -- ");
}

function sectionHeading(value) {
  return `\\Needspace{3\\baselineskip}\n\\resumesection{${escapeLatex(value)}}`;
}

function bulletList(items) {
  if (!items.length) return "";
  return [
    "\\begin{resumeitemize}",
    ...items.map((item) => `  \\item ${escapeLatex(item)}`),
    "\\end{resumeitemize}",
  ].join("\n");
}

function profileBlock(resume) {
  const { basics } = resume;
  const contact = [];
  if (basics.location.address) contact.push(escapeLatex(basics.location.address));
  if (basics.email) {
    contact.push(`\\href{mailto:${urlValue(basics.email)}}{${escapeLatex(basics.email)}}`);
  }
  if (basics.phone) contact.push(escapeLatex(basics.phone));

  const links = basics.website.split(/\s+/).filter(Boolean).map((url) => ({
    label: "Website",
    url,
    display: compactUrlText(url),
  }));
  const seen = new Set(links.map((link) => link.url));
  for (const profile of basics.profiles.slice(0, 3)) {
    if (profile.url && !seen.has(profile.url)) {
      const label = profile.label || "Profile";
      links.push({ label, url: profile.url, display: label });
      seen.add(profile.url);
    }
  }

  return [
    "\\begin{flushleft}",
    `  {\\fontsize{22}{25}\\selectfont\\bfseries ${escapeLatex(basics.name)}}\\par`,
    basics.label
      ? `  \\vspace{2pt}{\\fontsize{11.5}{14}\\selectfont\\bfseries ${escapeLatex(basics.label)}}\\par`
      : "",
    contact.length
      ? `  \\vspace{3pt}{\\small ${contact.join(" \\enspace\\textbar\\enspace ")}}\\par`
      : "",
    links.length
      ? `  {\\small ${links.map((link) => (
        `\\textbf{${escapeLatex(link.label)}:} \\href{${urlValue(link.url)}}{${escapeLatex(link.display)}}`
      )).join(" \\enspace\\textbar\\enspace ")}}\\par`
      : "",
    "\\end{flushleft}",
    "\\vspace{-2pt}",
  ].filter(Boolean).join("\n");
}

function summaryBlock(resume) {
  return [
    sectionHeading(resume.headings.summary),
    escapeLatex(resume.summary),
  ].join("\n");
}

function skillsBlock(resume) {
  return [
    sectionHeading(resume.headings.skills),
    ...resume.skills.map((skill) => (
      `\\textbf{${escapeLatex(skill.name)}:} ${skill.keywords.map(escapeLatex).join(", ")}\\par`
    )),
  ].join("\n");
}

function workBlock(resume) {
  return [
    sectionHeading(resume.headings.work),
    ...resume.work.map((job) => [
      "\\Needspace{5\\baselineskip}",
      `\\textbf{${escapeLatex(job.company)}} --- \\textit{${escapeLatex(job.position)}}\\par`,
      [job.location, dateRange(job)].filter(Boolean).map(escapeLatex).join(" \\enspace\\textbar\\enspace ") + "\\par",
      bulletList(job.highlights),
    ].join("\n")),
  ].join("\n");
}

function projectsBlock(resume) {
  return [
    sectionHeading(resume.headings.projects),
    ...resume.projects.map((project) => [
      "\\Needspace{4\\baselineskip}",
      `\\textbf{${escapeLatex(project.name)}}${project.keywords.length ? ` --- \\textit{${project.keywords.map(escapeLatex).join(", ")}}` : ""}\\par`,
      project.url ? `\\textbf{Project link:} ${visibleUrl(project.url)}\\par` : "",
      project.description ? `${escapeLatex(project.description)}\\par` : "",
      bulletList(project.highlights),
    ].filter(Boolean).join("\n")),
  ].join("\n");
}

function educationBlock(resume) {
  return [
    sectionHeading(resume.headings.education),
    ...resume.education.map((item) => {
      const qualification = [item.studyType, item.area].filter(Boolean).join(" in ");
      const details = [qualification, item.score].filter(Boolean).join(" --- ");
      return [
        "\\begin{samepage}",
        `\\textbf{${escapeLatex(item.institution)}}\\par`,
        details ? `${escapeLatex(details)}\\par` : "",
        [item.location, dateRange(item)].filter(Boolean).map(escapeLatex).join(" \\enspace\\textbar\\enspace ") + "\\par",
        "\\end{samepage}",
      ].filter(Boolean).join("\n");
    }),
  ].join("\n");
}

function awardsBlock(resume) {
  return [
    sectionHeading(resume.headings.awards),
    ...resume.awards.map((award) => [
      "\\Needspace{3\\baselineskip}",
      [award.title, award.awarder].filter(Boolean).map(escapeLatex).join(" --- ") + "\\par",
      award.date ? `${escapeLatex(award.date)}\\par` : "",
      award.summary ? `${escapeLatex(award.summary)}\\par` : "",
    ].filter(Boolean).join("\n")),
  ].join("\n");
}

export function populatedSectionTitles(resume) {
  const titles = [];
  for (const section of resume.sections) {
    if (section === "summary" && resume.summary) titles.push(resume.headings.summary);
    else if (section === "skills" && resume.skills.length) titles.push(resume.headings.skills);
    else if (section === "work" && resume.work.length) titles.push(resume.headings.work);
    else if (section === "projects" && resume.projects.length) titles.push(resume.headings.projects);
    else if (section === "education" && resume.education.length) titles.push(resume.headings.education);
    else if (section === "awards" && resume.awards.length) titles.push(resume.headings.awards);
  }
  return titles;
}

export function buildAtsTex(resume) {
  const pageOption = resume.renderer.pageSize === "Letter" ? "letterpaper" : "a4paper";
  const leading = (Number(resume.renderer.bodyFontSize) * 1.22).toFixed(2);
  const blocks = [];
  for (const section of resume.sections) {
    if (section === "profile") blocks.push(profileBlock(resume));
    else if (section === "summary" && resume.summary) blocks.push(summaryBlock(resume));
    else if (section === "skills" && resume.skills.length) blocks.push(skillsBlock(resume));
    else if (section === "work" && resume.work.length) blocks.push(workBlock(resume));
    else if (section === "projects" && resume.projects.length) blocks.push(projectsBlock(resume));
    else if (section === "education" && resume.education.length) blocks.push(educationBlock(resume));
    else if (section === "awards" && resume.awards.length) blocks.push(awardsBlock(resume));
  }

  return [
    `\\documentclass[11pt,${pageOption}]{article}`,
    "\\usepackage[T1]{fontenc}",
    "\\usepackage[utf8]{inputenc}",
    "\\usepackage{lmodern}",
    "\\usepackage{xcolor}",
    "\\usepackage[margin=0.65in]{geometry}",
    "\\usepackage{url}",
    "\\usepackage[hidelinks,unicode]{hyperref}",
    "\\definecolor{sectionblue}{HTML}{1F4E79}",
    "\\renewcommand{\\textbf}[1]{{\\fontfamily{lmss}\\fontseries{bx}\\selectfont #1}}",
    "\\input{glyphtounicode}",
    "\\pdfgentounicode=1",
    "\\pagestyle{empty}",
    "\\setlength{\\parindent}{0pt}",
    "\\setlength{\\parskip}{2.5pt}",
    "\\setlength{\\emergencystretch}{2em}",
    "\\newcommand{\\Needspace}[1]{\\par\\penalty-100\\vskip0pt plus #1\\penalty9999\\vskip0pt plus -#1\\penalty0}",
    "\\newenvironment{resumeitemize}{%",
    "  \\begin{itemize}\\setlength{\\itemsep}{1.5pt}\\setlength{\\topsep}{2pt}\\setlength{\\parsep}{0pt}\\setlength{\\partopsep}{0pt}%",
    "}{\\end{itemize}}",
    "\\newcommand{\\resumesection}[1]{%",
    "  \\vspace{5pt}{\\color{sectionblue}\\fontsize{11.5}{13.5}\\selectfont\\bfseries\\MakeUppercase{#1}}\\par",
    "  \\vspace{4pt}\\hrule\\vspace{4pt}%",
    "}",
    `\\hypersetup{pdfauthor={${escapeLatex(resume.basics.name)}},pdftitle={${escapeLatex(resume.basics.name)} - Resume}}`,
    "\\begin{document}",
    `\\fontsize{${resume.renderer.bodyFontSize}}{${leading}}\\selectfont`,
    ...blocks,
    "\\end{document}",
  ].join("\n") + "\n";
}

async function prepareBundle(outputDir, basename, overwrite) {
  const resolvedOutput = path.resolve(outputDir);
  const bundleDir = path.resolve(resolvedOutput, basename);
  if (path.dirname(bundleDir) !== resolvedOutput) throw new Error("Output bundle escaped its destination.");
  try {
    await fs.access(bundleDir);
    if (!overwrite) throw new Error(`Output bundle already exists: ${bundleDir}`);
    await fs.rm(bundleDir, { recursive: true, force: true });
  } catch (cause) {
    if (cause.code !== "ENOENT") throw cause;
  }
  await fs.mkdir(bundleDir, { recursive: true });
  return bundleDir;
}

function compilePdf(texFilename, bundleDir) {
  const args = ["-no-shell-escape", "-interaction=nonstopmode", "-halt-on-error", texFilename];
  const logs = [];
  for (let pass = 1; pass <= 2; pass += 1) {
    const result = spawnSync(ENGINE, args, {
      cwd: bundleDir,
      encoding: "utf8",
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 20 * 1024 * 1024,
    });
    logs.push(`=== ${ENGINE} pass ${pass} ===\n${result.stdout || ""}${result.stderr || ""}`);
    if (result.error) return { ok: false, logs, message: `${ENGINE} could not be started: ${result.error.message}` };
    if (result.status !== 0) return { ok: false, logs, message: `${ENGINE} failed with exit code ${result.status}.` };
  }
  return { ok: true, logs };
}

function runTool(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 60_000,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw new Error(`${command} could not be started: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}: ${result.stderr || result.stdout}`);
  return result.stdout || "";
}

function inspectPdf(pdfPath, resume, buildLog) {
  if (/Overfull \\[hv]box/.test(buildLog)) {
    throw new Error("ATS TeX contains an overfull box. Revise the content or layout before delivery.");
  }
  const info = runTool("pdfinfo", [pdfPath]);
  const pageMatch = info.match(/^Pages:\s+(\d+)/m);
  const pageCount = pageMatch ? Number(pageMatch[1]) : null;
  if (!pageCount) throw new Error("Could not determine the generated PDF page count.");
  if (pageCount > 2) throw new Error(`ATS resume rendered to ${pageCount} pages; revise it to one or two evidence-led pages.`);

  const extracted = runTool("pdftotext", [pdfPath, "-"]);
  const logicalText = extracted.replace(/\s+/g, " ").trim();
  for (const [field, expected] of [
    ["basics.name", resume.basics.name],
    ["basics.label", resume.basics.label],
    ["basics.email", resume.basics.email],
  ]) {
    if (expected && !logicalText.toLowerCase().includes(expected.toLowerCase())) {
      throw new Error(`Extracted text is missing ${field}; the PDF is not ready for ATS delivery.`);
    }
  }
  let cursor = -1;
  for (const title of populatedSectionTitles(resume)) {
    const position = logicalText.toLowerCase().indexOf(title.toLowerCase(), cursor + 1);
    if (position < 0) throw new Error(`Extracted text is missing the ${title} heading.`);
    if (position < cursor) throw new Error(`Extracted section order is not logical at ${title}.`);
    cursor = position;
  }
  if (logicalText.includes("�")) throw new Error("Extracted text contains Unicode replacement glyphs.");

  const expectedLinks = [
    ...resume.basics.website.split(/\s+/).filter(Boolean),
    ...resume.basics.profiles.slice(0, 3).map((profile) => profile.url).filter(Boolean),
    ...resume.projects.map((project) => project.url).filter(Boolean),
  ];
  const urlInfo = expectedLinks.length ? runTool("pdfinfo", ["-url", pdfPath]) : "";
  const annotatedLinks = (urlInfo.match(/https?:\/\/\S+/gi) || []).length;
  if (expectedLinks.length && annotatedLinks === 0) {
    throw new Error("No URI annotations were found for the rendered links.");
  }

  return {
    pageCount,
    selectableText: true,
    logicalSectionOrder: true,
    unicodeReplacementGlyphs: false,
    annotatedLinks,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(usage());
    return;
  }
  if (!opts.input || !opts.outputDir || !opts.basename) throw new Error(usage());

  const report = validateResume(await readResume(path.resolve(opts.input)));
  if (!report.valid) throw new Error(`Resume validation failed:\n${JSON.stringify(report.errors, null, 2)}`);
  if (report.normalized.renderer.kind !== "ats") {
    throw new Error("renderer.kind must be ats; use render_resumake.mjs for original templates.");
  }

  const resume = report.normalized;
  const bundleDir = await prepareBundle(
    opts.outputDir,
    safeBundleBasename(opts.basename),
    opts.overwrite,
  );
  const documentBasename = sanitizeDocumentBasename(
    resume.renderer.documentBasename,
    `${resume.basics.name.replace(/\s+/g, "_")}_Resume`,
  );
  resume.renderer.documentBasename = documentBasename;
  const texFilename = `${documentBasename}.tex`;
  const texPath = path.join(bundleDir, texFilename);
  const pdfPath = path.join(bundleDir, `${documentBasename}.pdf`);
  const tex = buildAtsTex(resume);
  const forbiddenStructures = ["tabular", "multicols", "textblock", "tikzpicture"]
    .filter((token) => tex.includes(`\\begin{${token}}`));
  if (forbiddenStructures.length) throw new Error(`ATS TeX contains forbidden layout structures: ${forbiddenStructures.join(", ")}`);

  await fs.writeFile(path.join(bundleDir, "resume.json"), `${JSON.stringify(resume, null, 2)}\n`, "utf8");
  await fs.writeFile(texPath, tex, "utf8");
  await fs.writeFile(
    path.join(bundleDir, "README.md"),
    `# Custom ATS resume\n\nThis bundle was generated by the additive custom ATS renderer, not by an original Resumake template.\n\nCompile with:\n\n    ${ENGINE} -no-shell-escape ${texFilename}\n`,
    "utf8",
  );

  const qa = {
    renderer: "ats",
    bodyFontSize: resume.renderer.bodyFontSize,
    pageSize: resume.renderer.pageSize,
    tableFree: true,
    warnings: report.warnings,
    pdf: null,
  };
  if (!opts.texOnly) {
    const result = compilePdf(texFilename, bundleDir);
    const buildLog = result.logs.join("\n\n");
    await fs.writeFile(path.join(bundleDir, "build.log"), buildLog, "utf8");
    if (!result.ok) throw new Error(`${result.message}\nThe complete source bundle remains at ${bundleDir}. See build.log.`);
    await fs.access(pdfPath);
    qa.pdf = inspectPdf(pdfPath, resume, buildLog);
  }
  await fs.writeFile(path.join(bundleDir, "qa.json"), `${JSON.stringify(qa, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    renderer: "ats",
    engine: ENGINE,
    bundleDir,
    documentBasename,
    texPath,
    pdfPath: opts.texOnly ? null : pdfPath,
    qaPath: path.join(bundleDir, "qa.json"),
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
