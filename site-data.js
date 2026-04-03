const projectProgress = {
  percentage: 2
};

const authors = {
  kk: { name: "Kevin Kor", initials: "KK", url: "https://example.com/kevin", role: "Project Lead" },
  jk: { name: "Jaked", initials: "JK", role: "" },
  ga: { name: "Geekaholic", initials: "GA", role: "" },
  mc: { name: "Marcel", initials: "MC", url: "https://www.mgdproductions.com/", role: "" },
  mh: { name: "Matthew Hansen", initials: "MH", role: "" },
  mp: { name: "Moniker Prime", initials: "MP", role: "" },
  zm: { name: "Zetoman", initials: "ZM", role: "" },
  ad: { name: "Ander", initials: "AD", role: "" },
  sd: {
    name: "Sniperdude",
    initials: "SD",
    pfp: "https://example.com/sniperdude.jpg",
    url: "https://example.com/sniperdude",
    role: "Website Help"
  },
  dm: {
    name: "Demme",
    initials: "DM",
    pfp: "https://example.com/demme.jpg",
    url: "https://example.com/demme",
    role: "Community Manager & Assist"
  },
  ch: { name: "Chris", initials: "CH", role: "" }
};

const commits = [
  {
    date: "2026-03-03",
    categories: ["Board", "Firmware"],
    summary: "BOOTROM dump was a lost battle. The project is currently trying to get a custom version of U-Boot working.",
    authors: ["kk"]
  },
  {
    date: "2026-02-16",
    categories: ["Board", "Firmware"],
    summary: "Started dumping Jibo's BOOTROM.",
    authors: ["kk", "sd"]
  }
];
