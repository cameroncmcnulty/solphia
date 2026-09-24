import { emptyLaunchBook, ensureAccount } from "../launch/engine";
import { KEYS, kvDel, kvGetJson, kvSetEx } from "../persist";
import { withLaunch } from "../store";
import type { PhJob, PhSession } from "./phantomBox";

const TTL_SEC = 15 * 60;

export async function putPhJob(job: PhJob): Promise<void> {
  await kvSetEx(KEYS.phjob(job.id), job, TTL_SEC);
  await withLaunch((st) => {
    const book = st.launch || emptyLaunchBook();
    st.launch = book;
    if (!book.phJobs) book.phJobs = {};
    book.phJobs[job.id] = job;
    const cutoff = Date.now() - 20 * 60_000;
    for (const [id, row] of Object.entries(book.phJobs)) {
      if (!row?.at || row.at < cutoff) delete book.phJobs[id];
    }
  }, true);
}

export async function getPhJob(id: string): Promise<PhJob | null> {
  if (!id) return null;
  const fromKv = (await kvGetJson(KEYS.phjob(id))) as PhJob | null;
  if (fromKv?.id) return fromKv;
  const fromBook = await withLaunch((st) => st.launch?.phJobs?.[id] || null, false);
  return fromBook;
}

export async function delPhJob(id: string): Promise<void> {
  if (!id) return;
  await kvDel(KEYS.phjob(id));
  await withLaunch((st) => {
    if (st.launch?.phJobs?.[id]) delete st.launch.phJobs[id];
  }, true);
}

export async function loadPhSession(pubkey?: string): Promise<PhSession | null> {
  if (!pubkey) return null;
  return withLaunch((st) => {
    const row = st.launch?.accounts?.[pubkey]?.phSession;
    if (row?.dappSk && row.phantomPk && row.session) return row;
    return null;
  }, false);
}

export async function savePhSession(pubkey: string, sess: PhSession): Promise<void> {
  if (!pubkey) return;
  await withLaunch((st) => {
    const book = st.launch || emptyLaunchBook();
    st.launch = book;
    const acc = ensureAccount(book, pubkey);
    acc.phSession = sess;
  }, true);
}
