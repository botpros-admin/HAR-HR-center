// Quick test to see what Bitrix24 returns for file fields
console.log("Bitrix24 file field format:");
console.log("When a file is uploaded, Bitrix24 returns an object like:");
console.log({
  id: 123,
  url: "https://example.bitrix24.com/rest/download/?auth=xxx&token=disk%7CaWQ9...",
  downloadUrl: "https://example.bitrix24.com/rest/download/?auth=xxx&token=disk%7CaWQ9...",
  name: "filename.pdf",
  size: 12345
});
console.log("\nFor array file fields, it returns an array of such objects.");
