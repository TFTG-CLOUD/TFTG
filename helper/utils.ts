import os from 'os';
import fs from 'fs';
import path from 'path';

export function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // 如果没有找到本地 IP，返回 localhost
}

export function deleteAll(directoryPath: string) {
  if (!fs.existsSync(directoryPath)) {
    console.log(`Directory not found: ${directoryPath}`);
    return;
  }

  const files = fs.readdirSync(directoryPath);

  files.forEach((file) => {
    const currentPath = path.join(directoryPath, file);

    if (fs.statSync(currentPath).isDirectory()) {
      // 递归删除目录
      deleteAll(currentPath);
    } else {
      // 删除文件
      try {
        fs.unlinkSync(currentPath);
        console.log(`Deleted file: ${currentPath}`);
      } catch (err) {
        console.error(`Error deleting file: ${currentPath}`, err);
      }
    }
  });

  try {
    fs.rmdirSync(directoryPath);
    console.log(`Deleted directory: ${directoryPath}`);
  } catch (err) {
    console.error(`Error deleting directory: ${directoryPath}`, err);
  }
}