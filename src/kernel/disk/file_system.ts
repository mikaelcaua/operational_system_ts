import * as fs from "node:fs";

const DISK_SIZE = 20 * 1024 * 1024;
const CLUSTER_SIZE = 4096;
const FAT_ENTRIES = DISK_SIZE / CLUSTER_SIZE;

const FAT_SIZE_BYTES = FAT_ENTRIES * 2;
const DATA_START_OFFSET =
  Math.ceil(FAT_SIZE_BYTES / CLUSTER_SIZE) * CLUSTER_SIZE;

const FAT_TABLE = new Uint16Array(FAT_ENTRIES);

function persist_fat() {
  const buffer = Buffer.from(FAT_TABLE.buffer);
  const fd = fs.openSync("disk.txt", "r+");
  fs.writeSync(fd, buffer, 0, FAT_SIZE_BYTES, 0);
  fs.closeSync(fd);
}

function add_archive(name: string, data: any) {
  const buffer = Buffer.from(data);
  const size = buffer.length;
  const clustersNeeded = Math.ceil(size / CLUSTER_SIZE);

  let found = [];
  for (let i = 2; i < FAT_ENTRIES; i++) {
    if (FAT_TABLE[i] === 0) {
      found.push(i);
      if (found.length === clustersNeeded) break;
    }
  }

  if (found.length < clustersNeeded) return null;

  const fd = fs.openSync("disk.txt", "r+");

  for (let i = 0; i < found.length; i++) {
    const current = found[i];
    const isLast = i === found.length - 1;

    FAT_TABLE[current] = isLast ? 0xffff : found[i + 1];

    const start = i * CLUSTER_SIZE;
    const chunk = buffer.subarray(start, start + CLUSTER_SIZE);

    const diskOffset = DATA_START_OFFSET + current * CLUSTER_SIZE;
    fs.writeSync(fd, chunk, 0, chunk.length, diskOffset);
  }

  fs.closeSync(fd);
  persist_fat();

  return {
    name,
    sizeBytes: size,
    initialCluster: found[0],
  };
}
