// The readable text under each app's tool, plus the dates the sitemap reports.
// The page (components/AppGuide.tsx) and the FAQ structured data (lib/structured-data.ts) both read from here,
// so the FAQ in the HTML and the FAQ in the JSON-LD can never say different things.
//
// Keep every sentence TRUE to what the code does. If a limit changes, change it here too:
// - file size and types: lib/resume-file/rules.ts
// - characters per box: lib/text-rules.ts
// - daily and per-minute limits: the rate limiter at the top of app/api/analyze/route.ts and app/api/cover-letter/route.ts
// Plain text only (no HTML), because the same words go into the JSON-LD.
// No ratings, reviews, user counts or testimonials, ever.

export type FaqItem = { question: string; answer: string };

export type AppContent = {
  slug: string;
  updated: string; // YYYY-MM-DD: the day this page's words last changed. The sitemap's lastModified. Update it when you edit the page.
  whatItDoes: string;
  steps: { title: string; text: string }[]; // always 3
  whoFor: string;
  doesNot: string;
  faq: FaqItem[]; // always 5
};

const FILE_ANSWER =
  "You can upload a PDF, DOCX or TXT file of up to 5 MB. The file is read in your browser, and only the text from it is used. Scanned files (pictures of a page) and password-protected files cannot be read, so paste the text instead.";

export const appContent: Record<string, AppContent> = {
  "resume-matcher": {
    slug: "resume-matcher",
    updated: "2026-11-16",
    whatItDoes:
      "Resume Matcher compares your resume with one job description. It gives you an estimated match score from 0 to 100, one line that explains the score, the keywords from the job that your resume shows, the ones it does not show, and three specific changes you could make. It is free and you do not need to sign up.",
    steps: [
      {
        title: "Add your resume",
        text: "Upload a PDF, DOCX or TXT file of up to 5 MB, or paste the text. A file is read in your browser and its text goes into the resume box.",
      },
      {
        title: "Add the job description",
        text: "Paste the job post. Each box needs at least 200 characters and can hold up to 15,000.",
      },
      {
        title: "Read your results",
        text: "You get your match score, the keywords that match, the keywords that are missing, and three changes to consider.",
      },
    ],
    whoFor:
      "People who are applying for a specific job and want a quick second look at how their resume lines up with the job post. It is also useful when you are deciding which of your real skills to make easier to spot on your resume.",
    doesNot:
      "Resume Matcher does not guarantee an interview, a job offer or a pass through any company's hiring software. The score is an estimate made by an AI, not the way any real employer scores you. The AI can make mistakes, so a human must check every keyword and suggestion. Only add skills and experience you really have.",
    faq: [
      {
        question: "Is Resume Matcher free, and do I need an account?",
        answer:
          "It is free and there is no signup. To keep it free for everyone, there are limits on how often you can use it. They are explained below.",
      },
      {
        question: "Which resume files can I upload?",
        answer: FILE_ANSWER,
      },
      {
        question: "What happens to my resume and the job description?",
        answer:
          "When you press the button, the text in both boxes is sent to an AI service (Google Gemini) to produce your result. Vyuhika does not store your resume, the job description or your result. The AI service is run by Google and handles what it receives under its own terms.",
      },
      {
        question: "How much text can I use, and how often?",
        answer:
          "Each box needs at least 200 characters and can hold up to 15,000 characters. Each visitor can run up to 5 matches a minute and up to 30 matches a day. If you reach a limit, the page tells you, and you can try again a little later or tomorrow.",
      },
      {
        question: "How accurate is the match score?",
        answer:
          "The score is an estimate made by an AI that compares the words in your resume with the words in the job description. It can miss a skill that is written in different words, and it can make mistakes. Treat it as a starting point for your own judgement, not as a verdict.",
      },
    ],
  },

  "cover-letter-writer": {
    slug: "cover-letter-writer",
    updated: "2026-11-16",
    whatItDoes:
      "Cover Letter Writer drafts a cover letter from your resume and a job description. It is told to use only facts that are written in your resume. Where the job asks for something your resume does not show, the letter has a marked blank in square brackets, so you can add a real example of your own. It is free and you do not need to sign up.",
    steps: [
      {
        title: "Add your resume and the job",
        text: "Upload a PDF, DOCX or TXT file of up to 5 MB, or paste your resume. Then paste the job description. You can also add the company name, the role title and one thing you would like to highlight.",
      },
      {
        title: "Choose a tone and a length",
        text: "Pick professional, friendly or confident. Pick short (about 150 to 200 words) or medium (about 260 to 340 words).",
      },
      {
        title: "Check and finish the draft",
        text: "Read the whole letter, fill in the blanks with your own examples, and check every fact before you send it.",
      },
    ],
    whoFor:
      "People who are applying for a specific job and want a first draft in English that sticks to what their resume says. It is for anyone who would rather edit a draft than start from a blank page.",
    doesNot:
      "Cover Letter Writer does not guarantee an interview or a reply. It only knows what you give it, so it cannot add experience that your resume does not show; those parts stay as blanks for you to fill. The AI can still make mistakes or word something badly, so a human must check every fact and every sentence before the letter is sent. The letter has no address, date or contact details.",
    faq: [
      {
        question: "Is Cover Letter Writer free, and do I need an account?",
        answer:
          "It is free and there is no signup. To keep it free for everyone, each visitor can write up to 3 letters a minute and up to 15 letters a day. Asking for a new version of a letter counts as another letter. If you reach a limit, the page tells you, and you can try again a little later or tomorrow.",
      },
      {
        question: "Which resume files can I upload?",
        answer: FILE_ANSWER,
      },
      {
        question: "What happens to my resume, the job description and the letter?",
        answer:
          "When you press the button, the text you entered is sent to an AI service (Google Gemini) to write the letter. Vyuhika does not store your resume, the job description, your other answers or the letter. The AI service is run by Google and handles what it receives under its own terms.",
      },
      {
        question: "Will it make things up about me?",
        answer:
          "It is told to use only facts from your resume, and to leave a marked blank where the job asks for something your resume does not show. The tool also runs automatic checks on the draft. The AI can still make mistakes, so check every fact, number and name against your own records before you send the letter.",
      },
      {
        question: "How much text can I give it?",
        answer:
          "The resume and the job description each need at least 200 characters and can hold up to 15,000 characters. The company name and the role title can be up to 100 characters each, and the highlight can be up to 500 characters.",
      },
    ],
  },
  dwaar: {
    slug: "dwaar",
    updated: "2026-11-18",
    whatItDoes:
      "Dwaar helps you ask for a job referral. You pick a company and a job, add your resume, and send a request. Employees at that company who chose to receive requests can see it, and one of them may accept. After that you can chat with that person inside Dwaar. You sign in with Google.",
    steps: [
      {
        title: "Make your profile",
        text: "Sign in with Google and add your name, your LinkedIn link, your phone number and your skills. Your phone number stays private.",
      },
      {
        title: "Ask for a referral",
        text: "Choose the company and the job, add your resume and the job description, and check your match score first. A request needs a score of at least 60.",
      },
      {
        title: "Chat with the employee who accepts",
        text: "When an employee accepts, you can write to them in Dwaar. They can ask for your phone number or email in the chat, and you choose whether to share.",
      },
    ],
    whoFor:
      "People who want a referral for a specific job at a company, and employees who are happy to refer good candidates. Employees confirm their work email before they can see any request.",
    doesNot:
      "Dwaar does not promise a referral, an interview or a job. An employee decides for themselves, and a request can stay unanswered. A request that nobody accepts within 30 days expires. The match score is an estimate made by an AI, so check it yourself. The chat is checked by an AI, so share nothing that is not about the referral.",
    faq: [
      {
        question: "Is Dwaar free?",
        answer:
          "Yes. Asking for referrals, the match check and the chat are free. There are limits to keep it fair: up to 5 open requests at a time, and a limited number of resume checks each day.",
      },
      {
        question: "Who can see my request and my details?",
        answer:
          "Only employees at the company you chose who confirmed their work email and chose to receive requests. They see your name, headline, LinkedIn link, other links, skills, the job and your note. They also see your match score for the job and which skills matched. They do not see your resume until one of them accepts your request: that employee can then open it, and you can switch this off in the chat. Your phone number and email stay hidden unless you choose to share them in the chat.",
      },
      {
        question: "What happens to my resume?",
        answer:
          "Your resume file is stored privately and is used to check your match. An AI service (Google Gemini) reads its text for the match check. When a request is cancelled or old, the file is deleted. The privacy notice on the Dwaar page explains how long each thing is kept.",
      },
      {
        question: "Who can ask for my phone number or email?",
        answer:
          "Only the employee who accepted your request, and only inside the chat. You see their question and choose Share or Decline. If you decline, they cannot ask again for that request.",
      },
      {
        question: "What if nobody accepts my request?",
        answer:
          "It expires after 30 days and we email you. You can ask at another company or for another job. Employees can also leave a request unanswered, and that says nothing about your resume.",
      },
    ],
  },
};

// The date the home page's words last changed (the sitemap's lastModified for "/"). Update it when the home page or the apps list changes.
export const HOME_UPDATED = "2026-11-16";

// The visible FAQ of an app, in the order it is shown.
export function faqFor(slug: string): FaqItem[] {
  return appContent[slug]?.faq ?? [];
}
