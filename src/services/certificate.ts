import type { StudentProfile } from '../types';

export async function generateCertificate(student: StudentProfile, schoolName: string, signature: string) {
  const { default: jsPDF } = await import('jspdf');
  const certificateId = `AZDDS-${Date.now().toString(36).toUpperCase()}`;
  const completedAt = new Date().toLocaleString();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 792, 612, 'F');
  doc.setDrawColor(14, 116, 144);
  doc.setLineWidth(4);
  doc.rect(34, 34, 724, 544);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(28);
  doc.text('Defensive Driving Course Completion Certificate', 396, 110, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text('Designed for Arizona defensive driving compliance review. Approval pending unless updated by admin setting.', 396, 138, {
    align: 'center',
  });

  doc.setFontSize(18);
  doc.text(`Student: ${student.legalName}`, 86, 210);
  doc.text(`Class date / completion: ${completedAt}`, 86, 248);
  doc.text(`Court of jurisdiction: ${student.courtJurisdiction}`, 86, 286);
  doc.text(`Citation / docket: ${student.citationNumber || student.docketNumber}`, 86, 324);
  doc.text(`School: ${schoolName}`, 86, 362);
  doc.text(`Certificate ID: ${certificateId}`, 86, 400);

  doc.setFont('helvetica', 'italic');
  doc.text(signature, 560, 452, { align: 'center' });
  doc.setDrawColor(51, 65, 85);
  doc.line(445, 462, 675, 462);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Authorized signature', 560, 480, { align: 'center' });

  doc.save(`${certificateId}.pdf`);
  return { certificateId, completedAt };
}
