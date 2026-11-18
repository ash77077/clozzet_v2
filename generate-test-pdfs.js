const path = require('path');
const fs = require('fs');

const PdfPrinter = require('pdfmake');

const fontDir = path.join(__dirname, 'src/quotes/pdf/fonts');
const regular = path.join(fontDir, 'NotoSansArmenian-Regular.ttf');
const bold    = path.join(fontDir, 'NotoSansArmenian-Bold.ttf');

console.log('Font regular exists:', fs.existsSync(regular));
console.log('Font bold exists:   ', fs.existsSync(bold));

const fonts = {
  NotoSansArmenian: {
    normal:      regular,
    bold:        bold,
    italics:     regular,
    bolditalics: bold,
  },
  Roboto: {
    normal:      regular,
    bold:        bold,
    italics:     regular,
    bolditalics: bold,
  },
};

// Two test items
const items = [
  { description: 'Պոlո, 2 թlel, lոgо klrsdkin', quantity: 50, unitPrice: 6500, lineDiscountPercent: 0, lineTotal: 325000 },
  { description: 'Tlishlt',                       quantity: 30, unitPrice: 4000, lineDiscountPercent: 0, lineTotal: 120000 },
];

// 5% discount on subtotal
const subtotal     = 445000;
const discountTotal = subtotal * 0.05;    // 22250
const total         = subtotal - discountTotal; // 422750

function fmt(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' ֏';
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('ru-RU');
}

function buildDoc(lang) {
  const isHy = lang === 'hy';
  const L = isHy
    ? { quoteLabel:'Գnarro Ajoarkov', number:'Hambarr', version:'Tarbberkak',
        date:'Amsamitk', validUntil:'Vaverakank', client:'Hadjakhordort',
        item:'№', description:'Nkaragrrutiun', qty:'Chaker', unitPrice:'Miavor gin',
        discount:'Zllaparkhbekutiun', lineTotal:'Gramizaynovk', subtotal:'Yentdhanur',
        discountLabel:'Zlleghchaparkutiun', total:'Enddhtot', payment:'Vccharum',
        cash:'Kankhllik', invoice:'Hsshivapahanj', prepayment:'Kankhllik%',
        notes:'Tsanotumner' }
    : { quoteLabel:'Quote', number:'No.', version:'Ver.',
        date:'Date', validUntil:'Valid until', client:'Client',
        item:'#', description:'Description', qty:'Qty', unitPrice:'Unit price',
        discount:'Disc.', lineTotal:'Line total', subtotal:'Subtotal',
        discountLabel:'Discount', total:'Total', payment:'Payment',
        cash:'Cash', invoice:'Invoice', prepayment:'Prepayment %',
        notes:'Notes' };

  const rows = items.map((it, i) => [
    { text: String(i+1), fontSize:8 },
    { text: it.description, fontSize:8 },
    { text: String(it.quantity), fontSize:8, alignment:'center' },
    { text: fmt(it.unitPrice), fontSize:8, alignment:'right' },
    { text: it.lineDiscountPercent ? it.lineDiscountPercent+'%' : '—', fontSize:8, alignment:'center' },
    { text: fmt(it.lineTotal), fontSize:8, alignment:'right' },
  ]);

  return {
    pageSize: 'A4',
    pageMargins: [40,60,40,60],
    defaultStyle: { font:'NotoSansArmenian', fontSize:10, lineHeight:1.3 },
    content: [
      { columns: [
          { stack: [
              { text:'CLOZZET', fontSize:20, bold:true, color:'#1e3a5f' },
              { text:'clozzet.am', fontSize:9, color:'#6b7280' },
            ], width:'*' },
          { width:'auto', alignment:'right', stack: [
              { text: L.quoteLabel, fontSize:16, bold:true, color:'#1e3a5f' },
              { text:`${L.number}: Q-2026-TEST`, fontSize:9, color:'#374151' },
              { text:`${L.version}: 1`, fontSize:9, color:'#374151' },
              { text:`${L.date}: ${fmtDate(new Date())}`, fontSize:9, color:'#374151' },
              { text:`${L.validUntil}: ${fmtDate(new Date(Date.now()+14*864e5))}`, fontSize:9, color:'#374151' },
            ] },
        ], marginBottom:16 },
      { canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:1,lineColor:'#e2e8f0'}], marginBottom:14 },
      { columns: [
          { width:'*', stack: [
              { text: L.client, bold:true, fontSize:10, color:'#1e3a5f', marginBottom:2 },
              { text: 'Clozzet Test Company', fontSize:11, bold:true },
              { text: 'Ara Arakelyan', fontSize:9, color:'#374151' },
            ]},
          { width:'*', alignment:'right', stack:[
              { text:`${L.payment}: ${L.cash}`, fontSize:9 },
              { text:`${L.prepayment}: 50%`, fontSize:9 },
              { text: isHy ? 'Artunadrum: 14 or' : 'Lead time: 14 days', fontSize:9 },
            ]},
        ], marginBottom:16 },
      { table:{
          headerRows:1,
          widths:[20,'*',35,65,40,65],
          body:[
            [L.item,L.description,L.qty,L.unitPrice,L.discount,L.lineTotal].map(h=>({
              text:h, bold:true, fontSize:8, fillColor:'#f1f5f9', color:'#1e3a5f',
            })),
            ...rows,
          ],
        },
        layout:{
          hLineWidth:(i,n)=> i===0||i===1||i===n.table.body.length?1:0.5,
          vLineWidth:()=>0, hLineColor:()=>'#e2e8f0',
          paddingLeft:()=>5, paddingRight:()=>5,
          paddingTop:()=>4, paddingBottom:()=>4,
        }, marginBottom:14 },
      { alignment:'right', stack:[
          { columns:[{text:L.subtotal,bold:true,width:'*',fontSize:9},{text:fmt(subtotal),width:'auto',fontSize:9}] },
          { columns:[{text:L.discountLabel,bold:true,width:'*',fontSize:9,color:'#ef4444'},{text:'- '+fmt(discountTotal),width:'auto',fontSize:9,color:'#ef4444'}] },
          { canvas:[{type:'line',x1:0,y1:3,x2:180,y2:3,lineWidth:1,lineColor:'#1e3a5f'}], marginBottom:3 },
          { columns:[{text:L.total,bold:true,fontSize:13,color:'#1e3a5f',width:'*'},{text:fmt(total),bold:true,fontSize:13,color:'#1e3a5f',width:'auto'}] },
        ], marginBottom:20 },
      { text:'Ash — Sales Manager', fontSize:9, color:'#6b7280', alignment:'right', marginTop:16 },
    ],
  };
}

function generate(lang, outPath) {
  return new Promise((resolve, reject) => {
    const printer = new PdfPrinter(fonts);
    const doc = printer.createPdfKitDocument(buildDoc(lang));
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => { fs.writeFileSync(outPath, Buffer.concat(chunks)); resolve(); });
    doc.on('error', reject);
    doc.end();
  });
}

(async () => {
  const outDir = path.join(__dirname, '..', 'test-pdfs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const hyPath = path.join(outDir, 'quote-test-hy.pdf');
  const enPath = path.join(outDir, 'quote-test-en.pdf');
  await generate('hy', hyPath);
  console.log('Armenian PDF:', hyPath);
  await generate('en', enPath);
  console.log('English PDF: ', enPath);
  console.log('Total (hy):  ', 422750, '֏  (subtotal 445000 - 5% = 422750)');
})();
