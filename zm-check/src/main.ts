import { writeBinaryFile } from "@tauri-apps/api/fs";

import * as XLSX from "xlsx";
import { Client, getClient, ResponseType } from "@tauri-apps/api/http";
import { desktopDir } from "@tauri-apps/api/path";

let allUstIds: Array<string> = [];

let client: Client;

window.addEventListener("DOMContentLoaded", async () => {
  client = await getClient();

  document.querySelector("#file-input")?.addEventListener("change", (e) => {
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
      ) as any;

      allUstIds = Object.values(json).map((rowData: any) => {
        return rowData["Zeilenbeschriftungen"] + rowData["USt-IdNr."];
      });

      const idChunks = [];

      const chunkSize = 5;
      for (let i = 0; i < allUstIds.length; i += chunkSize) {
        idChunks.push(allUstIds.slice(i, i + chunkSize));
      }

      console.log("IDChunks", idChunks);

      for (const idChunk of idChunks) {
        const promises = idChunk.map((ustId) => {
          return checkUstId(ustId);
        });

        console.log("chunk load start", idChunk);

        const result = await Promise.all(promises);
        console.log("After awaited", result);

        result.forEach((singleResult) => {
          const target = document.querySelector(".ts-list-with-errors");

          for (let i = 0; i < json.length; i++) {
            if (
              json[i]["Zeilenbeschriftungen"] + json[i]["USt-IdNr."] ===
              singleResult.ustId
            ) {
              if (singleResult.code !== "200") {
                const entry = document.createElement("div");
                const entryText = document.createTextNode(
                  json[i]["Zeilenbeschriftungen"] +
                    json[i]["USt-IdNr."] +
                    " ---- " +
                    singleResult.resultMessage
                );

                entry.classList.add("ts-zm-entry");
                entry.appendChild(entryText);

                target?.appendChild(entry);
              }

              Object.assign(json[i], {
                Gultigkeit: singleResult.resultMessage,
              });
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

      const desktopPath = await desktopDir();

      writeBinaryFile(desktopPath + "example.xlsx", binaryData)
        .then(() => {
          console.log("File saved successfully!");
        })
        .catch((error) => {
          console.error("Error saving file:", error);
        });
    };
  });
});

async function checkUstId(ustId: string): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    client
      .get(
        `https://evatr.bff-online.de/evatrRPC?UstId_1=DE328147354&UstId_2=${ustId}&Firmenname=&Ort=&PLZ=&Strasse=`,
        { responseType: ResponseType.Text }
      )
      .then((data: any) => {
        console.log("reqFinish", ustId);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.data, "text/xml");

        const groupedValues = xmlDoc.querySelectorAll("string");

        const code = groupedValues[3].textContent as string;

        let resultMessage: string = "";

        if (code === "200") {
          resultMessage = "Die angefragte USt-IdNr. ist gültig.";
        }

        if (code === "201") {
          resultMessage = "Die angefragte USt-IdNr. ist ungültig.";
        }

        console.log(code);
        if (code === "204") {
          resultMessage =
            "Die angefragte USt-IdNr. ist ungültig. Sie war im Zeitraum von ... bis ... gültig (siehe Feld 'Gueltig_ab' und 'Gueltig_bis').";
        }

        if (code === "217") {
          resultMessage =
            "Bei der Verarbeitung der Daten aus dem angefragten EU-Mitgliedstaat ist ein Fehler aufgetreten. Ihre Anfrage kann deshalb nicht bearbeitet werden.";
        }

        resolve({
          ustId,
          code,
          resultMessage,
        });
      });
  });
}
