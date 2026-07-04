# Privacy Policy for HungerCues

*Last Updated: July 5, 2026*

Welcome to **HungerCues** (the "App"), an AI-powered intelligent child development companion. Your privacy and the security of your child's data are of paramount importance to us. This Privacy Policy describes how HungerCues collects, uses, stores, and protects personal information.

---

## 1. Information We Collect

To provide personalized insights and tracking capabilities, HungerCues collects the following types of information:

### A. Baby Profile Data
- **Name/Nickname**
- **Date of Birth** (used to calculate age in months for age-appropriate AI development milestones)
- **Gender**

### B. Child Activity Logs
- **Feedings:** Times, durations, amounts (ml), types (breast, bottle, formula), breast side (left/right), and notes.
- **Sleep Sessions:** Start/end times, durations, tracking methods, and notes.
- **Diaper Changes:** Times, diaper state (wet, dirty, mixed), and notes.
- **Growth Records:** Recorded date/time, weight (kg/lbs), height (cm/in), and notes.
- **Milestones:** Achievement dates, descriptions, notes, and uploaded photos or videos (media attachments).

### C. Account and Authentication Data
- **Email Address & Password:** Managed securely via **Google Firebase Authentication**. We do not store your password on our servers.
- **Authentication UID:** A unique identifier linked to your Firebase user record to isolate your family's data.

### D. Technical and Observability Data
- **Crash Logs and Diagnostics:** Collected via **Sentry** to help troubleshoot errors.
- **API Request Headers:** Includes anonymous tracing identifiers (UUIDs) for performance monitoring.

---

## 2. How We Use the Information

We use the collected data strictly for the following purposes:
- **Childcare Tracking:** To display histories, summaries, and charts of your baby's patterns.
- **AI-Powered Insights:** We transmit baby logs and profile details to the **Google Gemini API** to generate context-aware, personalized, and proactive parenting recommendations.
- **Push Notifications:** To schedule reminders for feedings or diaper changes based on logs.
- **App Support and Troubleshooting:** To analyze application crashes and improve performance.

---

## 3. Data Processing and Third-Party Subprocessors

HungerCues partners with trusted third-party services to deliver core features. We enforce the principle of data minimization and do not sell or lease any PII.

| Partner | Purpose | Data Exchanged | Compliance / Standards |
|---------|---------|----------------|------------------------|
| **Google Firebase** | Account Authentication | Email, UID, session tokens | GDPR, SOC 2 |
| **Google Gemini API** | AI-based insights & recommendations | Baby profile, age, activity logs (de-identified) | Enterprise data privacy rules |
| **Cloudflare R2** | Media attachment storage | Milestone photos/videos | SOC 2, HIPAA-compliant storage |
| **Sentry** | Error tracking and logging | Device info, stack traces (PII scrubbed) | ISO/IEC 27001, GDPR |

---

## 4. Data Retention, Security, and Deletion Rights

### A. Data Security
- All database connections and API transactions are encrypted in transit using **TLS (HTTPS)**.
- Sensitive files and databases are encrypted at rest using industry-standard AES encryption keys.
- Regular database backups are automatically compressed and securely uploaded to Cloudflare R2 storage.

### B. User Control & Deletion Rights (Right to be Forgotten)
- **Soft Deletion:** The App allows you to delete activities (feedings, sleeps, diaper changes, growth records). Deleted items are immediately removed from active dashboards and metrics.
- **Restoration:** Soft-deleted items are stored in a trash folder for user convenience and can be restored or permanently purged.
- **Permanent Account Deletion:** You can request the complete and permanent deletion of your account and all associated child data. This action is irreversible and purges all databases and R2 media files.
- To request account deletion, please contact support at: `support@hungercues.com`.

---

## 5. Children's Privacy (COPPA Compliance)

HungerCues is designed as a tool for parents and adult guardians. We do not knowingly collect personal information directly from children under the age of 13. If you believe a child under 13 has directly created an account, please contact us immediately to purge the record.

---

## 6. Updates to This Policy

We may update this Privacy Policy from time to time to reflect changes in our services or legal obligations. We will notify you of any material changes by updating the "Last Updated" date at the top of this page.

---

## 7. Contact Us

If you have any questions or concerns regarding this Privacy Policy or your data, please reach out to us:
- **Email:** `privacy@hungercues.com`
- **Support Portal:** `https://support.hungercues.com`
