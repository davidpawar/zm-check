import { invoke } from "@tauri-apps/api/tauri";
import { writeBinaryFile } from "@tauri-apps/api/fs";

import * as XLSX from "xlsx/xlsx.mjs";
import { Client, getClient, ResponseType } from "@tauri-apps/api/http";

let greetInputEl: HTMLInputElement | null;
let greetMsgEl: HTMLElement | null;

let allUstIds: Array<string> = [];
let madeRequests = 0;

let client: Client;

async function greet() {
  if (greetMsgEl && greetInputEl) {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    greetMsgEl.textContent = await invoke("greet", {
      name: greetInputEl.value,
    });
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  greetInputEl = document.querySelector("#greet-input");
  greetMsgEl = document.querySelector("#greet-msg");

  client = await getClient();

  const fileInputEl = document
    .querySelector("#file-input")
    ?.addEventListener("change", (e) => {
      e.stopPropagation();
      e.preventDefault();

      // @ts-ignore
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = async (e) => {
        // @ts-ignore
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        // use the workbook object to extract the data you need

        const json = XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]]
        );

        allUstIds = Object.values(json).map((rowData) => {
          return rowData["Zeilenbeschriftungen"] + rowData["USt-IdNr."];
        });

        const idChunks = [];
        const endResult = {};

        const chunkSize = 3;
        for (let i = 0; i < allUstIds.length; i += chunkSize) {
          idChunks.push(allUstIds.slice(i, i + chunkSize));
        }

        console.log("IDChunks", idChunks);

        // idChunks.forEach(async (idChunk) => {
        //   const promises = idChunk.map((ustId) => {
        //     return checkUstId(ustId);
        //   });

        //   console.log("chunk load start", idChunk);
        //   const result = await Promise.all(promises);
        //   console.log("After await", result);
        // });

        for (const idChunk of idChunks) {
          const promises = idChunk.map((ustId) => {
            return checkUstId(ustId);
          });

          console.log("chunk load start", idChunk);
          const result = await Promise.all(promises);
          console.log("After awaited", result);

          result.forEach((singleResult) => {
            for (let i = 0; i < json.length; i++) {
              if (
                json[i]["Zeilenbeschriftungen"] + json[i]["USt-IdNr."] ===
                singleResult.ustId
              ) {
                Object.assign(json[i], { Gultigkeit: singleResult.code });
                break;
              }
            }
          });
        }

        const newSheet = XLSX.utils.json_to_sheet(json);

        const workbook2 = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook2, newSheet, "Test");

        console.log("Document created", workbook2);

        const buffer = XLSX.write(workbook2, {
          bookType: "xlsx",
          type: "array",
        });

        const binaryData = new Uint8Array(buffer);

        writeBinaryFile("example.xlsx", binaryData)
          .then(() => {
            console.log("File saved successfully!");
          })
          .catch((error) => {
            console.error("Error saving file:", error);
          });
      };
    });

  document
    .querySelector("#greet-button")
    ?.addEventListener("click", () => greet());
});

async function checkUstId(ustId: string): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    client
      .get(
        `https://evatr.bff-online.de/evatrRPC?UstId_1=DE328147354&UstId_2=${ustId}&Firmenname=&Ort=&PLZ=&Strasse=`,
        { responseType: ResponseType.Text }
      )
      .then((data) => {
        console.log("reqFinish", ustId);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.data, "text/xml");

        const groupedValues = xmlDoc.querySelectorAll("string");

        const code = groupedValues[3].textContent as string;

        resolve({
          ustId,
          code,
        });
      });
  });
}
