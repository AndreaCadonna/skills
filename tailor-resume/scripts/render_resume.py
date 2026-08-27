#!/usr/bin/env python3

"""Render validated resume JSON as a compact local PDF."""

from __future__ import annotations

import argparse
import json
import re
import sys
from html import escape
from pathlib import Path

try:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        HRFlowable,
        KeepTogether,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )
except ImportError as cause:
    raise SystemExit(
        'reportlab is required. Install it with: python -m pip install reportlab'
    ) from cause


DEFAULT_HEADINGS = {
    'summary': 'Profile',
    'work': 'Work Experience',
    'skills': 'Skills',
    'education': 'Education',
    'projects': 'Projects',
}
DEFAULT_SECTIONS = [
    'profile',
    'summary',
    'work',
    'skills',
    'education',
    'projects',
]
ALLOWED_SECTIONS = set(DEFAULT_SECTIONS)


def clean(value) -> str:
    return value.strip() if isinstance(value, str) else ''


def items(value) -> list:
    return value if isinstance(value, list) else []


def normalize(data: dict) -> dict:
    basics = data.get('basics') if isinstance(data.get('basics'), dict) else {}
    location = (
        basics.get('location')
        if isinstance(basics.get('location'), dict)
        else {}
    )
    headings = (
        data.get('headings')
        if isinstance(data.get('headings'), dict)
        else {}
    )
    legacy_summary = next(
        (clean(award.get('summary')) for award in items(data.get('awards'))
         if isinstance(award, dict) and clean(award.get('summary'))),
        '',
    )
    return {
        'selectedTemplate': data.get('selectedTemplate', 1),
        'strategy': (
            data.get('strategy')
            if isinstance(data.get('strategy'), dict)
            else {}
        ),
        'headings': {**DEFAULT_HEADINGS, **headings},
        'sections': list(data.get('sections', DEFAULT_SECTIONS)),
        'basics': {
            'name': clean(basics.get('name')),
            'label': clean(basics.get('label')) or clean(basics.get('headline')),
            'email': clean(basics.get('email')),
            'phone': clean(basics.get('phone')),
            'website': clean(basics.get('website')),
            'location': {'address': clean(location.get('address'))},
            'profiles': [
                {'label': clean(row.get('label')), 'url': clean(row.get('url'))}
                for row in items(basics.get('profiles'))
                if isinstance(row, dict)
            ],
        },
        'summary': clean(data.get('summary')) or legacy_summary,
        'work': [
            {
                'company': clean(row.get('company')) or clean(row.get('name')),
                'position': clean(row.get('position')),
                'location': clean(row.get('location')),
                'startDate': clean(row.get('startDate')),
                'endDate': clean(row.get('endDate')),
                'highlights': [clean(x) for x in items(row.get('highlights')) if clean(x)],
            }
            for row in items(data.get('work')) if isinstance(row, dict)
        ],
        'skills': [
            {
                'name': clean(row.get('name')),
                'keywords': [clean(x) for x in items(row.get('keywords')) if clean(x)],
            }
            for row in items(data.get('skills')) if isinstance(row, dict)
        ],
        'education': [
            {
                'institution': clean(row.get('institution')),
                'location': clean(row.get('location')),
                'studyType': clean(row.get('studyType')),
                'area': clean(row.get('area')),
                'startDate': clean(row.get('startDate')),
                'endDate': clean(row.get('endDate')),
                'score': clean(row.get('score')) or clean(row.get('gpa')),
            }
            for row in items(data.get('education')) if isinstance(row, dict)
        ],
        'projects': [
            {
                'name': clean(row.get('name')),
                'description': clean(row.get('description')),
                'highlights': [
                    clean(x) for x in items(row.get('highlights')) if clean(x)
                ],
                'url': clean(row.get('url')),
                'keywords': [clean(x) for x in items(row.get('keywords')) if clean(x)],
            }
            for row in items(data.get('projects')) if isinstance(row, dict)
        ],
    }


def validate(resume: dict) -> None:
    errors = []
    if resume['selectedTemplate'] != 1:
        errors.append('selectedTemplate must be 1')
    if not resume['basics']['name']:
        errors.append('basics.name is required')
    unknown = [name for name in resume['sections'] if name not in ALLOWED_SECTIONS]
    if unknown:
        errors.append('unknown sections: ' + ', '.join(map(str, unknown)))
    if len(resume['sections']) != len(set(resume['sections'])):
        errors.append('sections must be unique')
    for index, job in enumerate(resume['work']):
        if not job['company'] or not job['position'] or not job['highlights']:
            errors.append(
                f'work[{index}] requires company, position, and highlights'
            )
    for index, skill in enumerate(resume['skills']):
        if not skill['name'] or not skill['keywords']:
            errors.append(f'skills[{index}] requires name and keywords')
    for index, row in enumerate(resume['education']):
        if not row['institution']:
            errors.append(f'education[{index}] requires institution')
    for index, project in enumerate(resume['projects']):
        if not project['name'] or not (
            project['description'] or project['highlights']
        ):
            errors.append(
                f'projects[{index}] requires name and description or highlights'
            )
    if errors:
        raise ValueError('; '.join(errors))


def safe_basename(value: str) -> str:
    safe = re.sub(r'[^A-Za-z0-9._-]+', '-', value)
    safe = re.sub(r'[-_.]{2,}', '-', safe).strip('.-_')[:100]
    return safe or 'resume'


def date_range(row: dict) -> str:
    start = row.get('startDate', '')
    end = row.get('endDate', '') or ('Present' if start else '')
    return ' - '.join(part for part in (start, end) if part)


def markup(value: str) -> str:
    return escape(value, quote=True)


def link(label: str, url: str) -> str:
    return f'<link href="{markup(url)}">{markup(label or url)}</link>'


def styles():
    sheet = getSampleStyleSheet()
    return {
        'name': ParagraphStyle(
            'ResumeName', parent=sheet['Normal'], fontName='Helvetica-Bold',
            fontSize=18, leading=20, alignment=TA_CENTER, spaceAfter=2,
        ),
        'contact': ParagraphStyle(
            'Contact', parent=sheet['Normal'], fontName='Helvetica',
            fontSize=7.8, leading=9.2, alignment=TA_CENTER, spaceAfter=4,
        ),
        'headline': ParagraphStyle(
            'Headline', parent=sheet['Normal'], fontName='Helvetica-Oblique',
            fontSize=10.2, leading=12, alignment=TA_CENTER, spaceAfter=2,
        ),
        'section': ParagraphStyle(
            'Section', parent=sheet['Normal'], fontName='Helvetica-Bold',
            fontSize=10.2, leading=11.5, alignment=TA_LEFT,
            spaceBefore=5, spaceAfter=1,
        ),
        'body': ParagraphStyle(
            'Body', parent=sheet['Normal'], fontName='Helvetica',
            fontSize=8.4, leading=10.2, alignment=TA_LEFT, spaceAfter=1.5,
        ),
        'left': ParagraphStyle(
            'Left', parent=sheet['Normal'], fontName='Helvetica-Bold',
            fontSize=8.7, leading=10,
        ),
        'left_italic': ParagraphStyle(
            'LeftItalic', parent=sheet['Normal'], fontName='Helvetica-Oblique',
            fontSize=8.2, leading=9.5,
        ),
        'right': ParagraphStyle(
            'Right', parent=sheet['Normal'], fontName='Helvetica',
            fontSize=8.1, leading=9.5, alignment=TA_RIGHT,
        ),
        'bullet': ParagraphStyle(
            'Bullet', parent=sheet['Normal'], fontName='Helvetica',
            fontSize=8.2, leading=9.8, leftIndent=10, firstLineIndent=-7,
            spaceAfter=1,
        ),
    }


def section(title: str, style: dict) -> list:
    return [
        Paragraph(markup(title).upper(), style['section']),
        HRFlowable(width='100%', thickness=0.6, color=colors.HexColor('#333333'),
                   spaceBefore=0, spaceAfter=2),
    ]


def two_column(left: str, right: str, style: dict, italic=False) -> Table:
    left_style = style['left_italic'] if italic else style['left']
    table = Table(
        [[Paragraph(left, left_style), Paragraph(right, style['right'])]],
        colWidths=[4.7 * inch, 2.1 * inch],
        hAlign='LEFT',
    )
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    return table


def build_pdf(resume: dict, target: Path) -> None:
    style = styles()
    doc = SimpleDocTemplate(
        str(target), pagesize=A4,
        leftMargin=0.62 * inch, rightMargin=0.62 * inch,
        topMargin=0.48 * inch, bottomMargin=0.48 * inch,
        title=resume['basics']['name'] + ' - Resume',
        author=resume['basics']['name'],
    )
    story = []

    for name in resume['sections']:
        if name == 'profile':
            basics = resume['basics']
            contacts = []
            if basics['location']['address']:
                contacts.append(markup(basics['location']['address']))
            if basics['email']:
                contacts.append(link(basics['email'], 'mailto:' + basics['email']))
            if basics['phone']:
                contacts.append(markup(basics['phone']))
            for url in basics['website'].split():
                contacts.append(link(re.sub(r'^https?://|/$', '', url), url))
            for profile in basics['profiles']:
                if profile['url']:
                    contacts.append(link(profile['label'] or profile['url'], profile['url']))
            story.extend([
                Paragraph(markup(basics['name']), style['name']),
            ])
            if basics['label']:
                story.append(Paragraph(markup(basics['label']), style['headline']))
            story.append(Paragraph(' | '.join(contacts), style['contact']))

        elif name == 'summary' and resume['summary']:
            story.extend(section(resume['headings']['summary'], style))
            story.append(Paragraph(markup(resume['summary']), style['body']))

        elif name == 'work' and resume['work']:
            story.extend(section(resume['headings']['work'], style))
            for job in resume['work']:
                first_bullet = Paragraph('&bull; ' + markup(job['highlights'][0]), style['bullet'])
                story.append(KeepTogether([
                    two_column(markup(job['company']), markup(job['location']), style),
                    two_column(markup(job['position']), markup(date_range(job)), style, italic=True),
                    first_bullet,
                ]))
                for bullet in job['highlights'][1:]:
                    story.append(Paragraph('&bull; ' + markup(bullet), style['bullet']))
                story.append(Spacer(1, 1.5))

        elif name == 'skills' and resume['skills']:
            story.extend(section(resume['headings']['skills'], style))
            for skill in resume['skills']:
                value = '<b>' + markup(skill['name']) + ':</b> '
                value += ', '.join(markup(keyword) for keyword in skill['keywords'])
                story.append(Paragraph(value, style['body']))

        elif name == 'education' and resume['education']:
            story.extend(section(resume['headings']['education'], style))
            for row in resume['education']:
                story.append(two_column(
                    markup(row['institution']), markup(row['location']), style
                ))
                qualification = ' in '.join(
                    part for part in (row['studyType'], row['area']) if part
                )
                if row['score']:
                    qualification += (' - ' if qualification else '') + row['score']
                story.append(two_column(
                    markup(qualification), markup(date_range(row)), style, italic=True
                ))
                story.append(Spacer(1, 1.5))

        elif name == 'projects' and resume['projects']:
            story.extend(section(resume['headings']['projects'], style))
            for project in resume['projects']:
                project_name = '<b>' + markup(project['name']) + '</b>'
                if project['keywords']:
                    project_name += ' - <i>' + ', '.join(
                        markup(keyword) for keyword in project['keywords']
                    ) + '</i>'
                project_label = re.sub(
                    r'^https?://(?:www\.)?', '', project['url']
                ).split('/')[0]
                project_link = link(
                    project_label or 'Project link', project['url']
                ) if project['url'] else ''
                story.append(two_column(project_name, project_link, style))
                if project['description']:
                    story.append(Paragraph(markup(project['description']), style['body']))
                for bullet in project['highlights']:
                    story.append(Paragraph('&bull; ' + markup(bullet), style['bullet']))
                story.append(Spacer(1, 1.5))

    doc.build(story)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--output-dir', type=Path, default=Path('output/resumes'))
    parser.add_argument('--basename', default='')
    parser.add_argument('--overwrite', action='store_true')
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        data = json.loads(args.input.read_text(encoding='utf-8-sig'))
        if not isinstance(data, dict):
            raise ValueError('resume JSON must contain an object')
        resume = normalize(data)
        validate(resume)

        output_dir = args.output_dir.resolve()
        output_dir.mkdir(parents=True, exist_ok=True)
        basename = safe_basename(args.basename or resume['basics']['name'])
        json_target = output_dir / (basename + '.json')
        pdf_target = output_dir / (basename + '.pdf')

        if not args.overwrite:
            existing = [path for path in (json_target, pdf_target) if path.exists()]
            if existing:
                raise FileExistsError(
                    'refusing to overwrite: ' + ', '.join(map(str, existing))
                )

        json_target.write_text(
            json.dumps(resume, indent=2, ensure_ascii=False) + '\n',
            encoding='utf-8',
        )
        build_pdf(resume, pdf_target)
        print(json.dumps({
            'artifacts': {'json': str(json_target), 'pdf': str(pdf_target)}
        }, indent=2))
        return 0
    except Exception as cause:
        print(str(cause), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
