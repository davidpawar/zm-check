import { writeBinaryFile } from "@tauri-apps/api/fs";

import * as XLSX from "xlsx";
import { Client, getClient, ResponseType } from "@tauri-apps/api/http";
import { desktopDir } from "@tauri-apps/api/path";

let client: Client;

window.addEventListener("DOMContentLoaded", async () => {
  client = await getClient();

  document.querySelector("#file-input")?.addEventListener("change", (event) => {
    event.stopPropagation();
    event.preventDefault();

    // Sometimes event can be null, catch that case.
    if (!event) {
      return;
    }

    const eventTargetElement = event.target as HTMLInputElement;
    const uploadedFileList = eventTargetElement.files;

    // Sometimes the uploadedFileList can be null, catch that case.
    if (!uploadedFileList) {
      return;
    }

    // We allow only single file upload, therefore the "first" file is relevant.
    const file = uploadedFileList[0];

    // In order to read a file, we need the FileReader and listen on the onload method.
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async (fileReaderEvent) => {
      // Will contain a list of all UstIds from the excel source file.
      let allUstIds: Array<string> = [];

      // For now we ignore the typing issue. I don´t want to create custom types just to shut down the compiler.
      // @ts-ignore
      const data = new Uint8Array(fileReaderEvent.target.result);

      // Step 1: Read the file as array, as we created the data as Uint8Array
      const workbook = XLSX.read(data, { type: "array" });

      // Step 2: Sheet as JSON is easier to use, so we convert it.
      const sheetAsJSON = XLSX.utils.sheet_to_json<any>(
        workbook.Sheets[workbook.SheetNames[0]]
      );

      // Based on the column names of the excel we can access the json
      allUstIds = Object.values(sheetAsJSON).map((rowData: any) => {
        return rowData["Zeilenbeschriftungen"] + rowData["USt-IdNr."];
      });

      // In order to improve performance and not overwhelm the server with too many requests
      // the UStChecks will be processed in chunks.
      const listOfUstChunks = [];

      // Set the size of the chunkList aka. how many parallel request are made.
      const chunkSize = 5;

      // Create the chunks.
      for (let i = 0; i < allUstIds.length; i += chunkSize) {
        listOfUstChunks.push(allUstIds.slice(i, i + chunkSize));
      }

      for (const ustChunk of listOfUstChunks) {
        // Create http promise for each entry in current chunk.
        const promises = ustChunk.map((ustId) => {
          return checkUstId(ustId);
        });

        // Wait for all promises to fullfill. This will avoid spamming the endpoint.
        const responseOfPromises = await Promise.all(promises);

        // Goals:
        // Goal 1: We want to render each error result into the view.
        // Goal 2: Update the given excel file and add a new column and
        responseOfPromises.forEach((singleResult) => {
          // We want to render the response of the API into the view. Therefore we need a node where to render into.
          const renderTarget = document.querySelector(".ts-list-with-errors");

          for (let i = 0; i < sheetAsJSON.length; i++) {
            // Run through the sheet and when we find the current singleResult then we can render it in the view and add a column in the row.
            if (
              sheetAsJSON[i]["Zeilenbeschriftungen"] +
                sheetAsJSON[i]["USt-IdNr."] ===
              singleResult.ustId
            ) {
              // We only need the error cases in the view.
              if (singleResult.code !== "200") {
                const entry = document.createElement("div");
                const entryText = document.createTextNode(
                  sheetAsJSON[i]["Zeilenbeschriftungen"] +
                    sheetAsJSON[i]["USt-IdNr."] +
                    " ---- " +
                    singleResult.resultMessage
                );

                entry.classList.add("ts-zm-entry");
                entry.appendChild(entryText);

                renderTarget?.appendChild(entry);
              }

              // Update the row with a new column.
              Object.assign(sheetAsJSON[i], {
                Gultigkeit: singleResult.resultMessage,
              });
              break;
            }
          }
        });
      }

      const newSheet = XLSX.utils.json_to_sheet(sheetAsJSON);

      const workbook2 = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook2, newSheet, "ZM geprueft");

      const buffer = XLSX.write(workbook2, {
        bookType: "xlsx",
        type: "array",
      });

      const binaryData = new Uint8Array(buffer);

      // Get location of desktop. We want to write the new excel file there.
      // Its easy to find for users.
      const desktopPath = await desktopDir();

      writeBinaryFile(desktopPath + "zm-geprueft.xlsx", binaryData)
        .then(() => {
          console.log("File saved successfully!");
        })
        .catch((error) => {
          console.error("Error saving file:", error);
        });
    };
  });
});

/**
 * Checks a given ustId by using bff-online.de service.
 * @param ustId A valid ustId.
 * @returns Promise of the http call.
 */
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
