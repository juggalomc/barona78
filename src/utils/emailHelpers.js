/**
 * Palīgfunkcija e-pastu saņēmēju iegūšanai
 * JSON formāts: [{ "email": "...", "invoice": true, "water": true }, ...]
 */
export const getEmailRecipients = (emailField, type = 'invoice') => {
  if (!emailField) return [];
  try {
    if (emailField.trim().startsWith('[')) {
      const contacts = JSON.parse(emailField);
      if (Array.isArray(contacts)) {
        return contacts.filter(c => c[type] === true).map(c => c.email);
      }
    }
  } catch (e) {}
  return [emailField];
};

export const formatEmailForDisplay = (emailField) => {
  const recipients = getEmailRecipients(emailField, 'invoice');
  return recipients.length > 0 ? recipients.join(', ') : emailField;
};