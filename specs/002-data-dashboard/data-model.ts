export interface Contact {
  id: string;
  name: string;
  email: string;
}

export type MessageType = "text" | "image" | "file";

interface BaseMessage {
  id: string;
  contactId: string;
  senderName: string;
  date: string; // ISO 8601 datetime string
}

export interface TextMessage extends BaseMessage {
  type: "text";
  content: string;
}

export interface ImageMessage extends BaseMessage {
  type: "image";
  altText: string;
  width: number;
  height: number;
}

export interface FileMessage extends BaseMessage {
  type: "file";
  filename: string;
  sizeBytes: number;
}

export type Message = TextMessage | ImageMessage | FileMessage;

// --- Static data (200 contacts, 500 messages) ---

function generateContacts(count: number): Contact[] {
  const firstNames = [
    "Alice", "Bob", "Carol", "David", "Eve", "Frank", "Grace", "Hank",
    "Iris", "Jack", "Karen", "Leo", "Mona", "Nick", "Olivia", "Paul",
    "Quinn", "Rosa", "Sam", "Tina", "Uma", "Vince", "Wendy", "Xander",
    "Yara", "Zach",
  ];
  const lastNames = [
    "Smith", "Jones", "Brown", "Davis", "Wilson", "Moore", "Taylor",
    "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Garcia",
    "Clark", "Lewis", "Hall", "Allen", "Young", "King",
  ];
  const domains = ["example.com", "test.org", "mail.net", "demo.io"];

  const contacts: Contact[] = [];
  for (let i = 0; i < count; i++) {
    const first = firstNames[i % firstNames.length];
    const last = lastNames[i % lastNames.length];
    const domain = domains[i % domains.length];
    contacts.push({
      id: `contact-${i}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@${domain}`,
    });
  }
  return contacts;
}

function generateMessages(
  count: number,
  contacts: Contact[]
): Message[] {
  const textContents = [
    "Hey, are you coming to the meeting tomorrow? We need to discuss the project timeline.",
    "Just wanted to follow up on our conversation from last week about the budget.",
    "Can you send me the latest report? I need it for the presentation.",
    "Thanks for your help with the project! Really appreciate it.",
    "Let me know when you're available for a quick call.",
    "I've updated the document with the changes we discussed.",
    "Don't forget about the deadline next Friday.",
    "Great news - the client approved the proposal!",
    "Could you review my pull request when you get a chance?",
    "The server is down again. Looking into it now.",
  ];
  const filenames = [
    "Report_Q1.pdf", "Budget_2026.xlsx", "Presentation.pptx",
    "meeting-notes.docx", "screenshot.png", "data-export.csv",
    "invoice-march.pdf", "design-mockup.fig", "README.md", "config.json",
  ];
  const altTexts = [
    "Team photo", "Architecture diagram", "Screenshot of dashboard",
    "Logo design", "Whiteboard notes", "Chart showing growth",
  ];

  const messages: Message[] = [];
  const baseDate = new Date("2026-01-01T09:00:00Z");

  for (let i = 0; i < count; i++) {
    const contact = contacts[i % contacts.length];
    const date = new Date(
      baseDate.getTime() + i * 3 * 60 * 60 * 1000 + (i * 17 * 60 * 1000) % (24 * 60 * 60 * 1000)
    );
    const dateStr = date.toISOString();
    const typeRoll = i % 10;

    if (typeRoll < 6) {
      messages.push({
        id: `msg-${i}`,
        contactId: contact.id,
        senderName: contact.name,
        date: dateStr,
        type: "text",
        content: textContents[i % textContents.length],
      });
    } else if (typeRoll < 8) {
      messages.push({
        id: `msg-${i}`,
        contactId: contact.id,
        senderName: contact.name,
        date: dateStr,
        type: "image",
        altText: altTexts[i % altTexts.length],
        width: 400 + (i * 73) % 1200,
        height: 300 + (i * 47) % 800,
      });
    } else {
      messages.push({
        id: `msg-${i}`,
        contactId: contact.id,
        senderName: contact.name,
        date: dateStr,
        type: "file",
        filename: filenames[i % filenames.length],
        sizeBytes: 1024 + (i * 9973) % (50 * 1024 * 1024),
      });
    }
  }

  return messages;
}

export const CONTACTS: Contact[] = generateContacts(200);
export const MESSAGES: Message[] = generateMessages(500, CONTACTS);
