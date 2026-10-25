/**
 * The words the form itself speaks to a respondent - buttons, progress, the thank-you page, sign-in prompts - in the
 * language the form's admin chose (`Form.language`). What the admin wrote (questions, help text, options, custom
 * messages and the thank-you text) is shown as written, so a Telugu form is written in Telugu in the builder.
 *
 * Not translated yet: the built-in validation messages ("This field is required" and friends), which stay in English
 * unless the admin sets a custom message on the rule, the toast pop-ups, and the sign-in dialog.
 */

export type FormLanguage = 'en' | 'te' | 'hi';

export const FORM_LANGUAGES: { code: FormLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
];

const en = {
  back: 'Back',
  next: 'Next',
  submit: 'Submit Form',
  submitting: 'Submitting...',
  update: 'Update Response',
  savingUpdates: 'Saving Updates...',
  notYetOpen: 'Submissions Not Yet Open',
  closed: 'Submissions Closed',
  savingDraft: 'Saving draft...',
  tryAgainIn: 'Try again in {n}s',
  swipeHint: 'Swipe sideways to see every option.',
  tooFast: 'You are going a little too fast. Please wait a moment and try again.',
  draftSaved: 'Draft saved',
  draftSavedAt: 'Draft saved at {time}',
  draftFailed: "Couldn't save your draft",
  pageOf: 'Page {n} of {total}',
  progress: 'Form progress',
  signInRequired: 'You must sign in to submit your response',
  signInButton: 'Sign In to Fill Form',
  alreadySubmitted: 'You have already submitted a response for this form',
  alreadySubmittedButton: 'Response Already Submitted',
  thanksTitle: 'Submission Received!',
  thanksUpdated: 'Response Updated!',
  thanksDefault: 'Thank you for submitting your response for {title}. A confirmation has been recorded under your verified account.',
  attendanceNote: 'Your attendance QR badge is now on your profile. Go to Profile → Registered Events to view it.',
  returnToForms: 'Return to Forms Center',
  redirectIn: 'Taking you onward in {n} seconds…',
  redirectInOne: 'Taking you onward in 1 second…',
  stayHere: 'Stay here',
  goNow: 'Go now',
  botCheckMissing: 'The bot check is not set up on this website yet, so this form cannot be submitted. Please tell the organisers.',
} as const;

export type FormStringKey = keyof typeof en;
type Dictionary = Record<FormStringKey, string>;

const te: Dictionary = {
  back: 'వెనుకకు',
  next: 'తదుపరి',
  submit: 'ఫారమ్ సమర్పించండి',
  submitting: 'సమర్పిస్తోంది...',
  update: 'ప్రతిస్పందనను నవీకరించండి',
  savingUpdates: 'మార్పులను సేవ్ చేస్తోంది...',
  notYetOpen: 'సమర్పణలు ఇంకా ప్రారంభం కాలేదు',
  closed: 'సమర్పణలు ముగిశాయి',
  savingDraft: 'డ్రాఫ్ట్ సేవ్ అవుతోంది...',
  tryAgainIn: '{n} సెకన్లలో మళ్ళీ ప్రయత్నించండి',
  swipeHint: 'అన్ని ఎంపికలను చూడటానికి పక్కకు స్వైప్ చేయండి.',
  tooFast: 'మీరు కొంచెం వేగంగా వెళ్తున్నారు. దయచేసి కొద్దిసేపు ఆగి మళ్ళీ ప్రయత్నించండి.',
  draftSaved: 'డ్రాఫ్ట్ సేవ్ అయింది',
  draftSavedAt: '{time} కి డ్రాఫ్ట్ సేవ్ అయింది',
  draftFailed: 'మీ డ్రాఫ్ట్‌ను సేవ్ చేయలేకపోయాం',
  pageOf: 'పేజీ {n} / {total}',
  progress: 'ఫారమ్ పురోగతి',
  signInRequired: 'మీ ప్రతిస్పందనను సమర్పించడానికి మీరు సైన్ ఇన్ చేయాలి',
  signInButton: 'ఫారమ్ నింపడానికి సైన్ ఇన్ చేయండి',
  alreadySubmitted: 'ఈ ఫారమ్‌కు మీరు ఇప్పటికే ప్రతిస్పందనను సమర్పించారు',
  alreadySubmittedButton: 'ప్రతిస్పందన ఇప్పటికే సమర్పించబడింది',
  thanksTitle: 'సమర్పణ అందింది!',
  thanksUpdated: 'ప్రతిస్పందన నవీకరించబడింది!',
  thanksDefault: '{title} కోసం మీ ప్రతిస్పందనను సమర్పించినందుకు ధన్యవాదాలు. మీ ధృవీకరించబడిన ఖాతా కింద నిర్ధారణ నమోదు చేయబడింది.',
  attendanceNote: 'మీ హాజరు QR బ్యాడ్జ్ ఇప్పుడు మీ ప్రొఫైల్‌లో ఉంది. చూడటానికి ప్రొఫైల్ → నమోదైన ఈవెంట్‌లకు వెళ్లండి.',
  returnToForms: 'ఫారమ్స్ సెంటర్‌కు తిరిగి వెళ్లండి',
  redirectIn: '{n} సెకన్లలో మిమ్మల్ని తరలిస్తున్నాం…',
  redirectInOne: '1 సెకనులో మిమ్మల్ని తరలిస్తున్నాం…',
  stayHere: 'ఇక్కడే ఉండండి',
  goNow: 'ఇప్పుడే వెళ్లండి',
  botCheckMissing: 'ఈ వెబ్‌సైట్‌లో బాట్ తనిఖీ ఇంకా సెటప్ కాలేదు, కాబట్టి ఈ ఫారమ్‌ను సమర్పించలేరు. దయచేసి నిర్వాహకులకు తెలియజేయండి.',
};

const hi: Dictionary = {
  back: 'वापस',
  next: 'आगे',
  submit: 'फ़ॉर्म जमा करें',
  submitting: 'जमा हो रहा है...',
  update: 'उत्तर अपडेट करें',
  savingUpdates: 'बदलाव सहेजे जा रहे हैं...',
  notYetOpen: 'जमा करना अभी शुरू नहीं हुआ',
  closed: 'जमा करना बंद है',
  savingDraft: 'ड्राफ़्ट सहेजा जा रहा है...',
  tryAgainIn: '{n} सेकंड में फिर कोशिश करें',
  swipeHint: 'सभी विकल्प देखने के लिए बगल में स्वाइप करें।',
  tooFast: 'आप थोड़ा तेज़ जा रहे हैं। कृपया थोड़ा रुककर फिर कोशिश करें।',
  draftSaved: 'ड्राफ़्ट सहेजा गया',
  draftSavedAt: '{time} बजे ड्राफ़्ट सहेजा गया',
  draftFailed: 'आपका ड्राफ़्ट सहेजा नहीं जा सका',
  pageOf: 'पृष्ठ {n} / {total}',
  progress: 'फ़ॉर्म की प्रगति',
  signInRequired: 'अपना उत्तर जमा करने के लिए आपको साइन इन करना होगा',
  signInButton: 'फ़ॉर्म भरने के लिए साइन इन करें',
  alreadySubmitted: 'आप इस फ़ॉर्म के लिए पहले ही उत्तर जमा कर चुके हैं',
  alreadySubmittedButton: 'उत्तर पहले ही जमा हो चुका है',
  thanksTitle: 'जमा प्राप्त हुआ!',
  thanksUpdated: 'उत्तर अपडेट हो गया!',
  thanksDefault: '{title} के लिए अपना उत्तर जमा करने के लिए धन्यवाद। आपके सत्यापित खाते में पुष्टि दर्ज कर ली गई है।',
  attendanceNote: 'आपका उपस्थिति QR बैज अब आपकी प्रोफ़ाइल में है। देखने के लिए प्रोफ़ाइल → पंजीकृत इवेंट पर जाएँ।',
  returnToForms: 'फ़ॉर्म केंद्र पर लौटें',
  redirectIn: '{n} सेकंड में आपको आगे ले जाया जा रहा है…',
  redirectInOne: '1 सेकंड में आपको आगे ले जाया जा रहा है…',
  stayHere: 'यहीं रहें',
  goNow: 'अभी जाएँ',
  botCheckMissing: 'इस वेबसाइट पर बॉट जाँच अभी सेट नहीं है, इसलिए यह फ़ॉर्म जमा नहीं हो सकता। कृपया आयोजकों को बताएँ।',
};

export const FORM_STRINGS: Record<FormLanguage, Dictionary> = { en, te, hi };

export function normalizeLanguage(code: unknown): FormLanguage {
  return code === 'te' || code === 'hi' ? code : 'en';
}

/** A string in the form's language, with `{name}` placeholders filled in. */
export function translate(language: unknown, key: FormStringKey, values: Record<string, string | number> = {}): string {
  const text = FORM_STRINGS[normalizeLanguage(language)][key] ?? en[key];
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}
