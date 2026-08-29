import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os
import sys

from docx_helpers import (
    set_cell_background,
    set_cell_margins,
    set_table_borders,
    format_table,
    add_styled_heading,
    add_callout,
    add_code_block
)

def create_document():
    doc = Document()
    
    # Page setup - Standard A4, 1 inch margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        
        # Header and Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("PANDU MANAGEMENT SYSTEM — ENTERPRISE SOFTWARE BLUEPRINT")
        hrun.font.name = 'Segoe UI'
        hrun.font.size = Pt(8)
        hrun.font.color.rgb = RGBColor(148, 163, 184) # Slate-400
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        frun_left = fp.add_run("Dokumen Arsitektur Sistem & Spesifikasi Teknis v2.0 | Confidential")
        frun_left.font.name = 'Calibri'
        frun_left.font.size = Pt(8)
        frun_left.font.color.rgb = RGBColor(148, 163, 184)

    # ----------------------------------------------------
    # COVER / TITLE BLOCK
    # ----------------------------------------------------
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(30)
    p_pre.paragraph_format.space_after = Pt(4)
    r_tag = p_pre.add_run("REVERSE ENGINEERING & TECHNICAL SYSTEM BLUEPRINT")
    r_tag.font.name = 'Segoe UI'
    r_tag.font.size = Pt(11)
    r_tag.font.bold = True
    r_tag.font.color.rgb = RGBColor(79, 70, 229) # Indigo
    
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(6)
    r_main = p_title.add_run("PANDU WORK MANAGEMENT SYSTEM")
    r_main.font.name = 'Segoe UI'
    r_main.font.size = Pt(26)
    r_main.font.bold = True
    r_main.font.color.rgb = RGBColor(15, 23, 42) # Slate-900
    
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(18)
    r_sub = p_sub.add_run("Platform Agile & Work Management Enterprise Modular Monolith dengan Inertia.js 3, React 19, Laravel 13, Fractional Ranking, DevSecOps, SRE Incident War Room, dan Multi-Provider AI Gateway")
    r_sub.font.name = 'Calibri'
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = RGBColor(71, 85, 105)
    
    # Metadata Table
    meta_tbl = doc.add_table(rows=4, cols=2)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(meta_tbl, color="CBD5E1")
    meta_data = [
        ("Nama Aplikasi", "Pandu Management (Kinetic Platform Enterprise)"),
        ("Teknologi Utama", "Laravel 13.17 (PHP 8.4) + React 19.2 + Inertia.js v3 + Tailwind CSS v4 + Wayfinder"),
        ("Database & ORM", "MySQL / PostgreSQL / SQLite (UUIDv7 Primary Key Strategy via HasUuidPrimaryKey)"),
        ("Status Dokumen", "Dokumentasi Arsitektur Final Berdasarkan Audit Komprehensif Source Code, Schema & API")
    ]
    for idx, (label, val) in enumerate(meta_data):
        cell_lbl = meta_tbl.cell(idx, 0)
        cell_val = meta_tbl.cell(idx, 1)
        set_cell_background(cell_lbl, "F1F5F9")
        set_cell_margins(cell_lbl, 80, 80, 100, 100)
        set_cell_margins(cell_val, 80, 80, 100, 100)
        
        p0 = cell_lbl.paragraphs[0]
        p0.paragraph_format.space_before = Pt(2)
        p0.paragraph_format.space_after = Pt(2)
        r0 = p0.add_run(label)
        r0.bold = True
        r0.font.name = 'Calibri'
        r0.font.size = Pt(9.5)
        
        p1 = cell_val.paragraphs[0]
        p1.paragraph_format.space_before = Pt(2)
        p1.paragraph_format.space_after = Pt(2)
        r1 = p1.add_run(val)
        r1.font.name = 'Calibri'
        r1.font.size = Pt(9.5)
        
    doc.add_page_break()
    return doc

print("Base document setup created.")
