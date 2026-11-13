// Site-wide settings: the one place for names and outside links.
// Components and emails read from here, so a link only ever needs changing in this file.

export const site = {
  name: "Vyuhika",
  tagline: "Intelligence, built in public.",
  owner: {
    name: "Yash Gaur",
    firstName: "Yash",
    portfolio: "https://yash-gaur.vyuhika.com/",
  },
  links: {
    linkedin: "https://www.linkedin.com/in/developer-yash-gaur/",
    youtube: "https://www.youtube.com/@FoodieDeveloper",
  },
};

// Attributes for links that open another site in a new tab.
// noopener stops the new page from controlling this one; noreferrer hides where the visitor came from.
export const externalLinkProps = { target: "_blank", rel: "noopener noreferrer" } as const;
