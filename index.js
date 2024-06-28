// jshint esversion: 6
// "use strict";
// https://jshint.com/

const PDFDocument = require("pdfkit");
// const EventEmitter = require('events').EventEmitter;

const rowHeights = {
  minimum: 1,
  medium: 2,
  maximum: 3
}

class PDFDocumentWithTables extends PDFDocument {
  
  columnSpacing = 0;
  columnsWidth = [];
  columnsPosition = [];
  columnWidth = 0;

  constructor(option) {
    super(option);
    this.opt = option;
    // this.emitter = new EventEmitter();
  }

  /**
   * addBackground
   * @param {Object} rect
   * @param {String} fillColor 
   * @param {Number} fillOpacity 
   * @param {Function} callback 
   */
  addBackground ({x, y, width, height}, fillColor, fillOpacity, callback) {

    // validate
    fillColor || (fillColor = 'grey');
    fillOpacity || (fillOpacity = 0.1);

    // save current style
    this.save();

    // draw bg
    this
    .fill(fillColor)
    //.stroke(fillColor)
    .fillOpacity(fillOpacity)
    .rect( x, y, width, height )
    //.stroke()
    .fill();

    // back to saved style
    this.restore();

    // restore
    // this
    // .fillColor('black')
    // .fillOpacity(1)
    // .fill();

    typeof callback === 'function' && callback(this);
    
  }

  /**
   * table
   * @param {Object} table 
   * @param {Options} options 
   * @param {Function} callback 
   */
  table(table, options, callback) {
    return new Promise((resolve, reject) => {
      try {

        typeof table === 'string' && (table = JSON.parse(table));

        table || (table = {});
        options || (options = {});
    
        table.headers || (table.headers = []);
        table.datas || (table.datas = []);
        table.rows || (table.rows = []);
        table.options && (options = {...options, ...table.options});

        options.hideHeader || (options.hideHeader = false);
        options.padding || (options.padding = 0);
        options.columnsSize || (options.columnsSize = []);
        options.addPage || (options.addPage = false);
        options.absolutePosition || (options.absolutePosition = false);
        options.minRowHeight || (options.minRowHeight = 0);
        options.rowHeight || (options.rowHeight = rowHeights.medium); // * 1: minimum, 2: medium, 3: large
        // TODO options.hyperlink || (options.hyperlink = { urlToLink: false, description: null });
        
        // divider lines
        options.divider || (options.divider = {});
        options.divider.header      || (options.divider.header      = { disabled: false, width: undefined, opacity: undefined });
        options.divider.horizontal  || (options.divider.horizontal  = { disabled: false, width: undefined, opacity: undefined });
        options.divider.vertical    || (options.divider.vertical    = { disabled: true, width: undefined, opacity: undefined });

        if(!table.headers.length) throw new Error('Headers not defined. Use options: hideHeader to hide.');

        if(options.useSafelyMarginBottom === undefined) options.useSafelyMarginBottom = true;
    
        const title            = table.title    ? table.title    : ( options.title    || '' ) ;
        const subtitle         = table.subtitle ? table.subtitle : ( options.subtitle || '' ) ;
    
        // const columnIsDefined  = options.columnsSize.length ? true : false;
        const columnSpacing    = options.columnSpacing || 3; // TODO: Renaming in rowSpacing! Defines the size or space occupied by columns
          let columnsWidth     = [];
          let columnsPosition  = []; // 0, 10, 20, 30, 100
          let columnWidth      = 0; // * Is used only when columns
    
        const rowDistance      = 0.5;
        const rowHeight        = options.rowHeight;
          let cellPadding      = {top: 0, right: 0, bottom: 0, left: 0}; // universal
    
        const prepareHeader    = options.prepareHeader || (() => this.fillColor('black').font("Helvetica-Bold").fontSize(8).fill());
        const prepareRow       = options.prepareRow || ((row, indexColumn, indexRow, rectRow, rectCell) => this.fillColor('black').font("Helvetica").fontSize(8).fill());
        //const prepareCell      = options.prepareCell || ((cell, indexColumn, indexRow, indexCell, rectCell) => this.fillColor('black').font("Helvetica").fontSize(8).fill());
        
          let tableWidth       = 0;
        const maxY             = this.page.height - (this.page.margins.bottom); // this.page.margins.top + 
    
          let startX           = options.x || this.x || this.page.margins.left;
          let startY           = options.y || this.y || this.page.margins.top;

          let lastPositionX    = 0; 
          let rowBottomY       = 0;

          //------------ experimental fast variables
          let titleHeight     = 0;
          this.headerHeight    = 0;
          let firstLineHeight = 0;
          this.datasIndex     = 0;
          this.rowsIndex     = 0 ;
          let lockAddTitles   = false; // to addd title one time
          let lockAddPage     = false;
          let lockAddHeader   = false;
          let safelyMarginBottom = this.page.margins.top/2; 
          
        // reset position to margins.left
        if( options.x === null || options.x === -1 ){
          startX = this.page.margins.left;
        }
    
        const createTitle = (data, size, opacity) => {
          if (!data) return;
    
          // get height line
          // let cellHeight = 0;
          if (typeof data === 'string'){
            this.fillColor('black').fontSize(size).opacity(opacity).fill();

            const tHeight = this.heightOfString(data, {
              width: tableWidth,
              align: 'left',
            });

            // console.log(tHeight);

            this.text(data, startX, startY).opacity(1); // moveDown( 0.5 )
            // startY += cellHeight;
            startY = this.y + columnSpacing + 2;
          } else if (typeof data === 'object'){
            data.fontFamily && this.font(data.fontFamily);
            data.label && this.fillColor(data.color || 'black').fontSize(data.fontSize || size).text(data.label, startX, startY).fill();

            startY = this.y + columnSpacing + 2;

          }  
        };
    
        // add a new page before crate table
        options.addPage === true && onFirePageAdded(); // this.emitter.emit('addPage'); //this.addPage();
    
        // // create title and subtitle
        // createTitle( title, 12, 1 );
        // createTitle( subtitle, 9, 0.7 );
    
        // add space after title
        // if( title || subtitle ){
        //   startY += 3;
        // };

        // event emitter
        const onFirePageAdded = () => {
          // startX = this.page.margins.left;
          startY = this.page.margins.top;
          rowBottomY = 0;
          // lockAddPage || this.addPage(this.options);
          lockAddPage || this.addPage({
            layout: this.page.layout,
            size: this.page.size,
            margins: this.page.margins,
          });
          lockAddHeader || addHeader();
          //addHeader();
        };
        
        // add fire
        // this.emitter.removeAllListeners();
        // this.emitter.on('addTitle', addTitle);
        // this.emitter.on('addSubtitle', addSubTitle);
        // this.emitter.on('addPage', onFirePageAdded);
        // this.emitter.emit('addPage');
        // this.on('pageAdded', onFirePageAdded);

        // warning - eval can be harmful
        const fEval = (str) => {
          let f = null; eval('f = ' + str); return f;
        };
   
        const separationsColumn = () => {
         // soon 
        }
        
        const separationsRow = (type, x, y, width, opacity, color) => {

          type || (type = 'horizontal'); // header | horizontal | vertical 

          // distance
          const d = rowDistance;
          // Right margin table
          const m = options.x || this.page.margins.left || 30;
          // disabled
          const s = options.divider[type].disabled || false;
          
          if(s === true) return;
          opacity = opacity || options.divider[type].opacity || 0.5;
          width   = width || options.divider[type].width || 0.5;
          color   = color || options.divider[type].color || 'black';
    
          // draw
          this
          .moveTo(x, y - d)
          .lineTo(x + tableWidth - m, y - d)
          .lineWidth(width)
          .strokeColor(color)
          .opacity(opacity)
          .stroke()
          // Reset opacity after drawing the line
          .opacity(1); 
    
        };
    
        // padding: [10, 10, 10, 10]
        // padding: [10, 10]
        // padding: {top: 10, right: 10, bottom: 10, left: 10}
        // padding: 10,
        const prepareCellPadding = (p) => {
    
          // array
          if(Array.isArray(p)){
            switch(p.length){
              case 3: p = [...p, 0]; break;
              case 2: p = [...p, ...p]; break;
              case 1: p = Array(4).fill(p[0]); break;
            }
          }
          // number
          else if(typeof p === 'number'){
            p = Array(4).fill(p);
          }
          // object
          else if(typeof p === 'object'){
            const {top, right, bottom, left} = p;
            p = [top, right, bottom, left];
          } 
          // null
          else {
            p = Array(4).fill(0);
          }
    
          return {
            top:    p[0] >> 0, // int
            right:  p[1] >> 0, 
            bottom: p[2] >> 0, 
            left:   p[3] >> 0,
          };
        
        };
    
        const prepareRowOptions = (row) => {
    
          // validate
          if( typeof row !== 'object' || !row.hasOwnProperty('options') ) return; 
    
          const {fontFamily, fontSize, color} = row.options;
    
          fontFamily && this.font(fontFamily); 
          fontSize && this.fontSize(fontSize); 
          color && this.fillColor(color); 
    
          // row.options.hasOwnProperty('fontFamily') && this.font(row.options.fontFamily); 
          // row.options.hasOwnProperty('fontSize') && this.fontSize(row.options.fontSize); 
          // row.options.hasOwnProperty('color') && this.fillColor(row.options.color); 
    
        };
    
        const prepareRowBackground = (row, rect) => {
    
          // validate
          if(typeof row !== 'object') return;
    
          // options
          row.options && (row = row.options);
    
          let { fill, opac } = {};
    
          // add backgroundColor
          if(row.hasOwnProperty('columnColor')){ // ^0.1.70
    
            const { columnColor, columnOpacity } = row;
            fill = columnColor; 
            opac = columnOpacity;
          
          } else if(row.hasOwnProperty('backgroundColor')){ // ~0.1.65 old
    
            const { backgroundColor, backgroundOpacity } = row;
            fill = backgroundColor; 
            opac = backgroundOpacity;
          
          } else if(row.hasOwnProperty('background')){ // dont remove
    
            if(typeof row.background === 'object'){
              let { color, opacity } = row.background;
              fill = color; 
              opac = opacity;
            }
    
          }
    
          fill && this.addBackground(rect, fill, opac);
          
        };
        
        const computeRowHeight = (row, isHeader) => {
          
          let result = isHeader ? 0 : (options.minRowHeight || 0);
          let cellp;
    
          // if row is object, content with property and options
          if(!Array.isArray(row) && typeof row === 'object' && !row.hasOwnProperty('property')) {
            const cells = []; 
            // get all properties names on header
            table.headers.forEach(({property}) => cells.push(row[property]) );
            // define row with properties header
            row = cells;  
          }
    
          row.forEach((cell, index) => {
    
            let text = cell;
    
            // object
            // read cell and get label of object
            if(typeof cell === 'object') {
              // define label
              text = String(cell.label);
              // apply font size on calc about height row 
              cell.hasOwnProperty('options') && prepareRowOptions(cell);
            }
    
            text = String(text).replace('bold:','').replace('size',''); // TODO: Pecionata da rimuovere
            
            // cell padding
            cellp = prepareCellPadding(table.headers[index].padding || options.padding || 0);
            // cellp = prepareCellPadding(options.padding || 0);
            //  - (cellp.left + cellp.right + (columnSpacing * 2))
            // console.log(cellp);
    
            // calc height size of string
            let cellHeight = this.heightOfString(text, {
              width: columnsWidth[index] - (cellp.left + cellp.right),
              align: 'left',
            });

            // if (rowHeight === rowHeights.minimum) cellHeight = cellHeight / 2;
            // else if (rowHeight === rowHeights.maximum) cellHeight = cellHeight * 2;
            
            result = Math.max(result, cellHeight);    
          });

          // isHeader && (result = Math.max(result, options.minRowHeight));

          // if(result + columnSpacing === 0) {
          //   computeRowHeight(row);
          // }
    
          return result + (columnSpacing);
        };
    
        // Calc columns size
        
        const calcColumnSizes = () => {
          let t_columnsWidth = [];
          let t_columnsPosition = [];
          let t_tableWidth = 0;
    
          // * Set temp (max) table width
          t_tableWidth = this.page.width - (options.x || this.page.margins.left) - this.page.margins.right;
          // (table width) 2o - Size defined
          options.width && ( t_tableWidth = parseInt(options.width) || String(options.width).replace(/[^0-9]/g,'') >> 0 );
    
          // - 1. columnsWidth is decided by headers width, if defined
          table.headers.forEach(header => {
            header.width && t_columnsWidth.push(header.width); // - columnSpacing
          });

          // - 2. columnsWidth is decided by options.columnsSize (e.g.: [150, 150, 150]), if defined
          if(t_columnsWidth.length === 0) t_columnsWidth = options.columnsSize; 

          // - 3. columnsWidth is divided equally by headers length
          if(t_columnsWidth.length === 0) {
            columnWidth = ( t_tableWidth / table.headers.length ); // - columnSpacing // define column width
            table.headers.forEach( () => t_columnsWidth.push(columnWidth) );
          }
    
          // * Set columns position
          t_columnsWidth.reduce((previousWidth, currentWidth) => {
            t_columnsPosition.push(previousWidth >> 0);
            return previousWidth + currentWidth;
          },(options.x || this.page.margins.left));
    
          // * Set columns width and position
          t_columnsWidth.length && (columnsWidth = t_columnsWidth);
          t_columnsPosition.length && (columnsPosition = t_columnsPosition);
    
          // * Set table width
          t_tableWidth = t_columnsPosition[t_columnsPosition.length-1] + t_columnsWidth[t_columnsWidth.length-1];
          t_tableWidth && (tableWidth = t_tableWidth);
          
          // Ajust spacing
          // tableWidth = tableWidth - (h.length * columnSpacing);     
        };
    
        calcColumnSizes();
    
        // Header
    
        const addHeader = () => { 
          prepareHeader(); // * Allow the user to override style for headers
    
          // calc header height
          if(this.headerHeight === 0){
            this.headerHeight = computeRowHeight(table.headers, true);
          }

          // calc first table line when init table
          if(firstLineHeight === 0){
            if(table.datas.length > 0){
              firstLineHeight = computeRowHeight(table.datas[0], true);
            }
            if(table.rows.length > 0){
              firstLineHeight = computeRowHeight(table.rows[0], true);
            }
          }

          // 24.1 is height calc title + subtitle
          titleHeight = !lockAddTitles ? 24.1 : 0; 
          // calc if header + first line fit on last page
          const calc = startY + titleHeight + firstLineHeight + this.headerHeight + safelyMarginBottom// * 1.3;

          // content is big text (crazy!)
          if(firstLineHeight > maxY) {
            // lockAddHeader = true;
            lockAddPage = true;
            console.log('CRAZY! This a big text on cell');
          } else if(calc > maxY) { // && !lockAddPage
            // lockAddHeader = false;
            lockAddPage = true;
            onFirePageAdded(); // this.emitter.emit('addPage'); //this.addPage();
            return;
          } 

          // if has title
          if(lockAddTitles === false) {

            // create title and subtitle
            createTitle( title, 12, 1 );
            createTitle( subtitle, 9, 0.7 );
        
            // add space after title
            if( title || subtitle ){
              startY += 3;
            };

          }

          // Allow the user to override style for headers
          prepareHeader();

          lockAddTitles = true;

          // this options is trial
          if(options.absolutePosition === true){
            lastPositionX = options.x || startX || this.x; // x position head
            startY = options.y || startY || this.y; // x position head  
          } else {
            lastPositionX = startX; // x position head  
          }
          
          // Check to have enough room for header and first rows. default 3
          // if (startY + 2 * this.headerHeight >= maxY) this.emitter.emit('addPage'); //this.addPage();
    
          if(!options.hideHeader && table.headers.length > 0) {
    
            // simple header
            if(typeof table.headers[0] === 'string') {
    
              // // background header
              // const rectRow = {
              //   x: startX, 
              //   y: startY - columnSpacing - (rowDistance * 2), 
              //   width: columnWidth, 
              //   height: this.headerHeight + columnSpacing,
              // };
    
              // // add background
              // this.addBackground(rectRow);
    
              // print headers
              table.headers.forEach((header, i) => {
    
                // background header
                const rectCell = {
                  x: lastPositionX, 
                  y: startY - columnSpacing - (rowDistance * 2), 
                  width: columnsWidth[i], 
                  height: this.headerHeight + columnSpacing,
                };
    
                // add background
                this.addBackground(rectCell);
    
                // cell padding
                cellPadding = prepareCellPadding(options.padding || 0);
    
                // write
                this.text(header, 
                  lastPositionX + (cellPadding.left), 
                  startY, {
                  width: Number(columnsWidth[i]) - (cellPadding.left + cellPadding.right),
                  align: 'left',
                });
                
                lastPositionX += columnsWidth[i] >> 0;
    
              });
              
            }else{
    
              // Print all headers
              table.headers.forEach( (dataHeader, i) => {
    
                let {label, width, renderer, align, headerColor, headerOpacity, headerAlign, padding} = dataHeader;
                // check defination
                width = width || columnsWidth[i];
                align = headerAlign || align || 'left';
        
                // register renderer function
                if(renderer && typeof renderer === 'string') {
                  table.headers[i].renderer = fEval(renderer);
                }

                // # Rotation
                // var doTransform = function (x, y, angle) {
                //   var rads = angle / 180 * Math.PI;
                //   var newX = x * Math.cos(rads) + y * Math.sin(rads);
                //   var newY = y * Math.cos(rads) - x * Math.sin(rads);
                  
                //   return {
                //       x: newX,
                //       y: newY,
                //       rads: rads,
                //       angle: angle
                //       };
                //   };
                // }
                // this.save(); // rotation
                // this.rotate(90, {origin: [lastPositionX, startY]});
                // width = 50;

                // background header
                const rectCell = {
                  x: lastPositionX, 
                  y: startY - columnSpacing - (rowDistance * 2), 
                  width: width, 
                  height: this.headerHeight + columnSpacing,
                };

                // add background
                this.addBackground(rectCell, headerColor, headerOpacity);
    
                // cell padding
                cellPadding = prepareCellPadding(padding || options.padding || 0);
    
                // write
                this.text(label, 
                  lastPositionX + (cellPadding.left), 
                  startY, {
                  width: width - (cellPadding.left + cellPadding.right),
                  align: align,
                })

                lastPositionX += width;
                // this.restore(); // rotation
    
              });
    
            }
    
            // set style
            prepareRowOptions(table.headers);
    
          }
    
          if(!options.hideHeader) {
            // Refresh the y coordinate of the bottom of the headers row
            rowBottomY = Math.max(startY + computeRowHeight(table.headers, true), rowBottomY);
            // Separation line between headers and rows
            separationsRow('header', startX, rowBottomY);
          } else {
            rowBottomY = startY;
          }
  
        };
    
        // End header
        addHeader();

        function separateProperties(property) {
          // Espressione regolare per trovare le sottostringhe di tipo "[x]" dove x è un numero
          let regex = /\[\d+\]|\./g;
          // Array per immagazzinare i risultati
          let risultati = [];
          // Variabile temporanea per immagazzinare le parole
          let temp = '';
          
          for (let i = 0; i < property.length; i++) {
              let char = property[i];
              // Se il carattere corrente è un punto o inizia una sottostringa di tipo "[x]"
              if (char === '.' || (char === '[' && property.slice(i).match(/^\[\d+\]/))) {
                  // Se abbiamo una parola temporanea, la aggiungiamo ai risultati
                  if (temp !== '') {
                      risultati.push(temp);
                      temp = '';
                  }
                  // Se è un punto, lo ignoriamo
                  if (char === '.') {
                      continue;
                  }
                  // Troviamo la sottostringa di tipo "[x]"
                  let match = property.slice(i).match(/^\[\d+\]/)[0];
                  // Aggiungiamo il numero convertito ai risultati
                  risultati.push(parseInt(match.slice(1, -1), 10));
                  // Incrementiamo l'indice i per saltare la sottostringa "[x]"
                  i += match.length - 1;
              } else {
                  // Aggiungiamo il carattere corrente alla parola temporanea
                  temp += char;
              }
          }
          // Aggiungiamo l'ultima parola se esiste
          if (temp !== '') {
              risultati.push(temp);
          }
          
          return risultati;
        }
        
        // Datas
        table.datas.forEach((row, i) => {
    
          this.datasIndex = i;
          const rowHeight = computeRowHeight(row, false);
          console.log(rowHeight);
    
          // Switch to next page if we cannot go any further because the space is over.
          // For safety, consider 3 rows margin instead of just one
          // if (startY + 2 * rowHeight < maxY) startY = rowBottomY + columnSpacing + rowDistance; // 0.5 is spacing rows
          // else this.emitter.emit('addPage'); //this.addPage();
          if(options.useSafelyMarginBottom && this.y + safelyMarginBottom + rowHeight >= maxY && !lockAddPage) onFirePageAdded(); // this.emitter.emit('addPage'); //this.addPage();    

          // calc position
          startY = rowBottomY + columnSpacing + rowDistance; // 0.5 is spacing rows

          // unlock add page function
          lockAddPage = false;
          
          const rectRow = {
            x: startX, 
            y: startY - columnSpacing - (rowDistance * 2), 
            width: tableWidth - startX, 
            height: rowHeight + columnSpacing,
          };
    
          // add background row
          prepareRowBackground(row, rectRow);
    
          lastPositionX = startX; 
    
          // Print all cells of the current row
          table.headers.forEach(( dataHeader, index) => {
    
            let {property, width, renderer, align, valign, padding} = dataHeader;
            
            // check defination
            width = width || columnWidth;
            align = align || 'left';
    
            // cell padding
            cellPadding = prepareCellPadding(padding || options.padding || 0);
    
            const rectCell = {
              x: lastPositionX,
              y: startY - columnSpacing - (rowDistance * 2),
              width: width,
              height: rowHeight + columnSpacing,
            }
    
            // allow the user to override style for rows
            prepareRowOptions(row);
            prepareRow(row, index, i, rectRow, rectCell);
    
            const nestedProperties = separateProperties(property);
            let text = row;
            for (const property of nestedProperties) {
              text = text[property];
              if (text === undefined) break;
            }
    
            // cell object
            if(typeof text === 'object'){
    
              text = String(text.label); // get label
              // row[property].hasOwnProperty('options') && prepareRowOptions(row[property]); // set style
    
              // options if text cell is object
              if( row[property].hasOwnProperty('options') ){
    
                // set font style
                prepareRowOptions(row[property]);
                prepareRowBackground(row[property], rectCell);
    
              }
        
            } else {
    
              // style column by header
              prepareRowBackground(table.headers[index], rectCell);
    
            }
    
            // bold
            if( String(text).indexOf('bold:') === 0 ){
              this.font('Helvetica-Bold');
              text = text.replace('bold:','');
            }
    
            // size
            if( String(text).indexOf('size') === 0 ){
              let size = String(text).substr(4,2).replace(':','').replace('+','') >> 0;
              this.fontSize( size < 7 ? 7 : size );
              text = text.replace(`size${size}:`,'');
            }
    
            // renderer column
            // renderer && (text = renderer(text, index, i, row, rectRow, rectCell)) // value, index-column, index-row, row  nbhmn
            if(typeof renderer === 'function'){
              text = renderer(text, index, i, row, rectRow, rectCell); // value, index-column, index-row, row, doc[this]
            }
    
            // TODO # Experimental
            // ------------------------------------------------------------------------------
            // align vertically
            let topTextToAlignVertically = 0;
            if(valign && valign !== 'top'){
              const heightText = this.heightOfString(text, {
                width: width - (cellPadding.left + cellPadding.right),
                align: align,
              }); 
              // line height, spacing hehight, cell and text diference
              topTextToAlignVertically = rowDistance - columnSpacing + (rectCell.height - heightText) / 2;  
            }
            // ------------------------------------------------------------------------------
    
            this.text(text, 
              lastPositionX + (cellPadding.left), 
              startY + topTextToAlignVertically, {
              width: width - (cellPadding.left + cellPadding.right),
              align: align,
            });  
            
            lastPositionX += width; 
    
            // set style
            // Maybe REMOVE ???
            prepareRowOptions(row);
            prepareRow(row, index, i, rectRow, rectCell);
    
          });
    
          // Refresh the y coordinate of the bottom of this row
          rowBottomY = Math.max(startY + rowHeight, rowBottomY);

          // console.log(this.page.height, rowBottomY, this.y);
          // text is so big as page (crazy!)
          if(rowBottomY > this.page.height) {
            rowBottomY = this.y + columnSpacing + (rowDistance * 2);
          }

          // Separation line between rows
          separationsRow('horizontal', startX, rowBottomY);
    
          // review this code
          if( row.hasOwnProperty('options') ){
            if( row.options.hasOwnProperty('separation') ){
              // Separation line between rows
              separationsRow('horizontal',startX, rowBottomY, 1, 1);
            }
          }
    
        });
        // End datas
    
        // Rows
        table.rows.forEach((row, i) => {
    
          this.rowsIndex = i;
          const rowHeight = computeRowHeight(row, false);
          console.log(rowHeight);

          // Switch to next page if we cannot go any further because the space is over.
          // For safety, consider 3 rows margin instead of just one
          // if (startY + 3 * rowHeight < maxY) startY = rowBottomY + columnSpacing + rowDistance; // 0.5 is spacing rows
          // else this.emitter.emit('addPage'); //this.addPage(); 
          if(options.useSafelyMarginBottom && this.y + safelyMarginBottom + rowHeight >= maxY && !lockAddPage) onFirePageAdded(); // this.emitter.emit('addPage'); //this.addPage(); 
          
          // calc position
          startY = rowBottomY + columnSpacing + rowDistance; // 0.5 is spacing rows

          // unlock add page function
          lockAddPage = false;
          
          const rectRow = {
            x: columnsPosition[0], 
            // x: startX, 
            y: startY - columnSpacing - (rowDistance * 2), 
            width: tableWidth - startX, 
            height: rowHeight + columnSpacing,
          }
    
          // add background
          // doc.addBackground(rectRow);
    
          lastPositionX = startX; 
    
          row.forEach((cell, index) => {
    
            let align = 'left';
            let valign = undefined;
    
            const rectCell = {
              // x: columnPositions[index],
              x: lastPositionX,
              y: startY - columnSpacing - (rowDistance * 2),
              width: columnsWidth[index],
              height: rowHeight + columnSpacing,
            }
    
            prepareRowBackground(table.headers[index], rectCell);
    
            // Allow the user to override style for rows
            prepareRow(row, index, i, rectRow, rectCell);
    
            if(typeof table.headers[index] === 'object') {
              // renderer column
              table.headers[index].renderer && (cell = table.headers[index].renderer(cell, index, i, row, rectRow, rectCell, this)); // text-cell, index-column, index-line, row, doc[this]
              // align
              table.headers[index].align && (align = table.headers[index].align);
              table.headers[index].valign && (valign = table.headers[index].valign);
            }
    
            // cell padding
            cellPadding = prepareCellPadding(table.headers[index].padding || options.padding || 0);
    
            // TODO # Experimental
            // ------------------------------------------------------------------------------
            // align vertically
            let topTextToAlignVertically = 0;
            if(valign && valign !== 'top'){
              const heightText = this.heightOfString(cell, {
                width: columnsWidth[index] - (cellPadding.left + cellPadding.right),
                align: align,
              }); 
              // line height, spacing hehight, cell and text diference
              topTextToAlignVertically = rowDistance - columnSpacing + (rectCell.height - heightText) / 2;  
            }
            // ------------------------------------------------------------------------------
    
            this.text(cell, 
              lastPositionX + (cellPadding.left),
              startY + topTextToAlignVertically, {
              width: columnsWidth[index] - (cellPadding.left + cellPadding.right),
              align: align,
            });
    
            lastPositionX += columnsWidth[index];
    
          });
    
          // Refresh the y coordinate of the bottom of this row
          rowBottomY = Math.max(startY + rowHeight, rowBottomY);

          // console.log(this.page.height, rowBottomY, this.y);
          // text is so big as page (crazy!)
          if(rowBottomY > this.page.height) {
            rowBottomY = this.y + columnSpacing + (rowDistance * 2);
          }
    
          // Separation line between rows
          separationsRow('horizontal', startX, rowBottomY);      
    
        });
        // End rows
        
        // update position
        this.x = startX;
        this.y = rowBottomY; // position y final;
        this.moveDown(); // break
    
        // add fire
        this.off("pageAdded", onFirePageAdded);
    
        // callback
        typeof callback === 'function' && callback(this);
        
        // nice :)
        resolve();
        
      } catch (error) {

        // error
        reject(error);
      
      }

    });
  }

    /**
   * tables
   * @param {Object} tables 
   * @returns 
   */
  async tables(tables, callback) {
    return new Promise(async (resolve, reject) => {
      try {

        if(Array.isArray(tables) === false)
        {
          resolve();
          return;
        }

        const len = tables.length;
        for(let i; i < len; i++)
        {
          await this.table(tables[i], tables[i].options || {});
        }

        // if tables is Array
        // Array.isArray(tables) ?
        // // for each on Array
        // tables.forEach( async table => await this.table( table, table.options || {} ) ) :
        // // else is tables is a unique table object
        // ( typeof tables === 'object' ? this.table( tables, tables.options || {} ) : null ) ;
        // // callback
        typeof callback === 'function' && callback(this);
        // // donw!
        resolve();
      } 
      catch(error)
      {
        reject(error);
      }

    });
  }

}

module.exports = PDFDocumentWithTables;
module.exports.default = PDFDocumentWithTables;
