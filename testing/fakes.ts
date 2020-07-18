type GmailLabel = GoogleAppsScript.Gmail.GmailLabel;
type GmailThread = GoogleAppsScript.Gmail.GmailThread;
type GmailMessage = GoogleAppsScript.Gmail.GmailMessage;

class Fake<T> {
  fake(): T {
    return this as unknown as T;
  }
}

export class FakeGmailApp {
  private static labelMap: Map<string, FakeGmailLabel>;

  static setData(params: GmailAppParams) {
    FakeGmailApp.labelMap = new Map((params.labels ?? []).map(
        labelParams => [labelParams.name, new FakeGmailLabel(labelParams)]));
  }

  static getUserLabelByName(name: string): GmailLabel|null {
    const label = FakeGmailApp.labelMap.get(name)?.fake();
    return label;
  }
}

interface GmailAppParams {
  labels?: GmailLabelParams[];
}

class FakeGmailLabel extends Fake<GmailLabel> {
  private threads: Set<FakeGmailThread> = new Set();

  constructor(private readonly params: GmailLabelParams) {
    super();

    for (const threadParams of this.params.threads ?? []) {
      const fakeGmailThread = new FakeGmailThread(threadParams);
      fakeGmailThread.addLabel(this);
    }
  }

  getName(): string {
    return this.params.name;
  }

  getThreads(): GmailThread[] {
    return Array.from(this.threads).map(fakeThread => fakeThread.fake());
  }

  addThread(thread: FakeGmailThread) {
    this.threads.add(thread);
  }

  removeThread(thread: FakeGmailThread) {
    this.threads.delete(thread);
  }
}

interface GmailLabelParams {
  name: string;
  threads?: GmailThreadParams[];
}

class FakeGmailThread extends Fake<GmailThread> {
  private labels: Set<string> = new Set();

  constructor(private readonly params: GmailThreadParams) {
    super();
  }

  addLabel(label: FakeGmailLabel) {
    this.labels.add(label.getName());
    label.addThread(this);
  }

  removeLabel(label: FakeGmailLabel) {
    this.labels.delete(label.getName());
    label.removeThread(this);
  }

  getMessages(): GmailMessage[] {
    return (this.params.messages ?? [])
        .map(messageParams => new FakeGmailMessage(messageParams).fake());
  }
}

interface GmailThreadParams {
  messages?: GmailMessageParams[];
}

class FakeGmailMessage extends Fake<GmailMessage> {
  constructor(private readonly params: GmailMessageParams) {
    super();
  }

  getDate(): Date {
    return this.params.date ?? new Date();
  }

  getFrom(): string {
    return this.params.from ?? 'Unset from (sender)';
  }

  getPlainBody(): string {
    return this.params.plainBody ?? 'Unset subject';
  }

  getSubject(): string {
    return this.params.subject ?? 'Unset subject';
  }
}

export interface GmailMessageParams {
  date?: Date;
  from?: string;
  plainBody?: string;
  subject?: string;
}


export class FakeProperties {
  private readonly properties = new Map<string, string>();

  deleteAllProperties() {
    this.properties.clear();
    return this;
  }
  deleteProperty(key: string) {
    this.properties.delete(key);
    return this;
  }
  getKeys() {
    return Array.from(this.properties.keys());
  }
  getProperties(): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const [key, value] of this.properties) {
      obj[key] = value;
    }
    return obj;
  }
  getProperty(key: string): string {
    return this.properties.get(key);
  }
  setProperties(properties: Record<string, string>, deleteAllOthers?: boolean) {
    deleteAllOthers ?? this.properties.clear();

    for (const key in properties) {
      this.properties.set(key, properties[key]);
    }
  }
  setProperty(key: string, value: string) {
    this.properties.set(key, value);
  }
}
