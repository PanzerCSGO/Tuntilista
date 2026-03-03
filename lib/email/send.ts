import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendParams {
  to: string;
  pdfBytes: Buffer;
  timesheetId: string;
}

export async function sendTimesheetEmail({
  to,
  pdfBytes,
  timesheetId,
}: SendParams) {
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "noreply@kmrinfra.fi",
    to,
    subject: `KMR Infra — Tuntilista ${new Date().toLocaleDateString("fi-FI")}`,
    text: `Hei,\n\nLiitteenä tuntilistasi (ID: ${timesheetId}).\n\nKMR Infra Oy`,
    attachments: [
      {
        filename: `tuntilista-${timesheetId}.pdf`,
        content: pdfBytes,
      },
    ],
  });

  if (error) throw new Error(`Sähköpostin lähetys epäonnistui: ${error.message}`);
}
