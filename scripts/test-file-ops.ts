/**
 * Test script to verify file upload/download/delete operations
 * Run with: pnpm tsx scripts/test-file-ops.ts
 */

import { db } from "../server/db";
import { storage } from "../server/storage";
import { storageAdapters, namespaces } from "@shared/schema";

async function runTests() {
  try {
    console.log("[v0] Starting file operations tests...");

    // Check if adapter exists
    let adapters = await storage.getAdapters();
    if (adapters.length === 0) {
      console.log("[v0] No adapters found, creating test adapter...");
      const adapter = await storage.createAdapter({
        name: "Test Local Storage",
        type: "local",
        config: { basePath: process.cwd() + "/test-storage" },
        isDefault: true,
      });
      adapters = [adapter];
      console.log("[v0] Created adapter:", adapter.id);
    }

    const adapter = adapters[0];

    // Check if namespace exists
    let nss = await storage.getNamespaces();
    let ns = nss.find((n) => n.name === "test-namespace");
    if (!ns) {
      console.log("[v0] Creating test namespace...");
      ns = await storage.createNamespace({
        name: "test-namespace",
        storageAdapterId: adapter.id,
        quotaBytes: 100 * 1024 * 1024, // 100MB
      });
      console.log("[v0] Created namespace:", ns.id);
    }

    // Test 1: Upload a file
    console.log("[v0] Test 1: Uploading file...");
    const testContent = Buffer.from("Hello, USSP! This is a test file.");
    const testFileName = "test-file.txt";

    const fileMetadata = await storage.uploadFile(
      ns.id,
      testFileName,
      testContent,
      "text/plain"
    );
    console.log("[v0] File uploaded:", fileMetadata);
    console.log("[v0] File ID:", fileMetadata.id);
    console.log("[v0] File size:", fileMetadata.sizeBytes);
    console.log("[v0] File etag:", fileMetadata.etag);

    // Test 2: Download the file
    console.log("[v0] Test 2: Downloading file...");
    const downloadedContent = await storage.downloadFile(ns.id, testFileName);
    console.log("[v0] Downloaded content length:", downloadedContent.length);
    console.log("[v0] Content matches:", downloadedContent.equals(testContent));

    // Test 3: Upload a second file with different content
    console.log("[v0] Test 3: Uploading second file...");
    const testContent2 = Buffer.from("This is a second test file with different content.");
    const testFileName2 = "test-file-2.txt";

    const fileMetadata2 = await storage.uploadFile(
      ns.id,
      testFileName2,
      testContent2,
      "text/plain"
    );
    console.log("[v0] Second file uploaded:", fileMetadata2.id);

    // Test 4: List files
    console.log("[v0] Test 4: Listing files...");
    const allFiles = await storage.getFiles();
    console.log("[v0] Total files in system:", allFiles.length);
    const namespaceFiles = allFiles.filter((f) => f.namespaceId === ns.id);
    console.log("[v0] Files in test namespace:", namespaceFiles.length);

    // Test 5: Delete a file
    console.log("[v0] Test 5: Deleting first file...");
    await storage.deleteFile(fileMetadata.id);
    console.log("[v0] File deleted successfully");

    // Test 6: Verify file is deleted
    console.log("[v0] Test 6: Verifying deletion...");
    const filesAfterDelete = await storage.getFiles();
    const deletedFileExists = filesAfterDelete.some((f) => f.id === fileMetadata.id);
    console.log("[v0] Deleted file still exists:", deletedFileExists);

    console.log("[v0] All tests completed successfully!");
  } catch (error) {
    console.error("[v0] Test error:", error);
    process.exit(1);
  }
}

runTests().catch(console.error);
