const fs = require("fs");
const PDFDocumentTable = require("./../index");


let docData = {
    margin: {
        x: 35.5,
        y: 42.5
    },
    logo: {
        radius: 34,
    }
}

// start pdf document
let doc = new PDFDocumentTable({ margins: { top: docData.margin.y, bottom: docData.margin.y, left: docData.margin.x, right: docData.margin.x}, size: 'A4', layout: 'landscape' });

docData.size = {
    x: doc.page.width,
    y: doc.page.height
}

doc.rect(docData.margin.x, docData.margin.y, docData.size.x - (docData.margin.x * 2), docData.size.y - (docData.margin.y * 2)).stroke(); // * Disegna il riquadro con margine
// to save on server
doc.pipe(fs.createWriteStream("./document-nest.pdf"));

const gruppiDiSpesaMillesimali = [
    {
        denominazione: "Spesa",
    },
    {
        denominazione: "Ciao"
    },
    {
        denominazione: "Prova"
    },
    {
        denominazione: "Test"
    }
];

const gruppiDiSpesaIndividuali = [
    {
        denominazione: "Acqua",
    },
    {
        denominazione: "Individuali"
    }
]


const data = [
    {
        scala: "A/1",
        nominativo: "Proprietario",
        nestedMillesimali: [
            {
                importo: 0.00,
                millesimi: 1.00,
            },
            {
                importo: 2.00,
                millesimi: 3.00,
            },
            {
                importo: 2.00,
                millesimi: 3.00,
            },
            {
                importo: 2.00,
                millesimi: 3.00,
            }
        ],
        nestedIndividuali: [
            {
                importo: 6.00
            },
            {
                importo: 6.00
            }
        ],
        totaleSpese: 0,
        saldoIniziale: 0,
        saldoVersato: 0,
        rateVersate: 0,
        saldoFinale: 0,
    },
    {
        scala: "A/2",
        nominativo: "Proprietario",
        nestedMillesimali: [
            {
                importo: 4.00,
                millesimi: 5.00,
            },
            {
                importo: 6.00,
                millesimi: 7.00,
            },
            {
                importo: 4.00,
                millesimi: 5.00,
            },
            {
                importo: 6.00,
                millesimi: 7.00,
            }
        ],
        nestedIndividuali: [
            {
                importo: 6.00
            },
            {
                importo: 6.00
            }
        ],
        totaleSpese: 0,
        saldoIniziale: 0,
        saldoVersato: 0,
        rateVersate: 0,
        saldoFinale: 0,
    },
    {
        scala: "A/2",
        nominativo: "Inquilino",
        nestedMillesimali: [
            {
                importo: 4.00,
                millesimi: 5.00,
            },
            {
                importo: 6.00,
                millesimi: 7.00,
            },
            {
                importo: 4.00,
                millesimi: 5.00,
            },
            {
                importo: 6.00,
                millesimi: 7.00,
            }
        ],
        nestedIndividuali: [
            {
                importo: 6.00
            },
            {
                importo: 6.00
            }
        ],
        totaleSpese: 0,
        saldoIniziale: 0,
        saldoVersato: 0,
        rateVersate: 0,
        saldoFinale: 0,
    }
]

const columns = 2 + (gruppiDiSpesaMillesimali.length * 2) + gruppiDiSpesaIndividuali.length + 5;
console.log(columns);
const width = (doc.page.width - (docData.margin.x * 2)) / columns;


let headers = [
    { label:"Scala/Int", property: 'scala', width: width },
    { label:"Nominativo", property: 'nominativo', width: width }, 
]

for (let index = 0; index < gruppiDiSpesaMillesimali.length; index++) {
    headers.push({
        label: 'Millesimi',
        property: `nestedMillesimali[${index}].millesimi`,
        width: width,
        align: 'right'
    });
    headers.push({
        label: 'Importo',
        property: `nestedMillesimali[${index}].importo`,
        width: width,
        align: 'right'
    });
}

for (let index = 0; index < gruppiDiSpesaIndividuali.length; index++) {
    headers.push({
        label: 'Importo',
        property: `nestedIndividuali[${index}].importo`,
        width: width,
        align: 'right'
    });
}

headers.push({ label: 'Totale spese', property: 'totaleSpese', width: width, align: 'right' });
headers.push({ label: 'Saldo iniziale', property: 'saldoIniziale', width: width, align: 'right' });
headers.push({ label: 'Saldo versato', property: 'saldoVersato', width: width, align: 'right' });
headers.push({ label: 'Rate versate', property: 'rateVersate', width: width, align: 'right' });
headers.push({ label: 'Saldo finale', property: 'saldoFinale', width: width, align: 'right' });

const table = {
    headers: headers,
    datas: data,
    options: {
        prepareHeader: () => doc.font('Helvetica-Bold', 5),
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
            doc.font("Helvetica").fontSize(5);
        }
    }
};

doc.table(table);

doc.end();
