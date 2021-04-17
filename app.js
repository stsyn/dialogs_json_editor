var project = {settings:{},elements:[],bonds:[],viewport:{}};
var colorScheme = [
{bg:"#fff",line:"#ddd",coord:"#f88",connections:"#111",actconn:"#8f8",fakeconn:"#f88",fakeconnt:"#800",
selected:"#00f",aconnections:"rgba(17,17,17,0)",aactconn:"rgba(136,255,136,0)",afakeconn:"rgba(255,136,136,0)",afakeconnt:"rgba(136,0,0,0)",
text:'#000',stext:'#fff',seltext:'#060'},
{bg:"#001",line:"#001828",coord:"#600",connections:"#4bb",actconn:"#060",fakeconn:"#600",fakeconnt:"#f88",
selected:"#880",aconnections:"rgba(68,187,187,0)",aactconn:"rgba(0,102,0,0)",afakeconn:"rgba(102,0,0,0)",afakeconnt:"rgba(255,136,136,0)",    
text:'#ccd',stext:'#111',seltext:'#8f8'}];
var ctx, tcx, zoomprop, linePattern, frame=0;
var doMoving = {};
var currentBrush = {};
var cache = {};
let fixed_point = 4;

var AuxBonds, AuxBonds2, dAuxBonds;
var AuxMove, tElemX, tElemY, tBond, tElem;


function isOnBond(id) {
	return false;
} 

function cCode(id, type) {
	if (type == 1) return 'C(T)'+id; 	//treat
	if (type == 2) return 'C(R)'+id;	//resource
	if (type == 3) return 'C(A)'+id;	//aim
	if (type == 4) return 'C(p)'+id;	//protector
	if (type == 5) return 'C(c)'+id;	//chaos, lol
	return 'C'+id;
}

function getCode(id) {
	var s='';
	var e = project.elements[id];
	if (e == undefined) return '';
	if (e.alias > -1) {
		for (var i=0; i<cache.elements[e.alias].aliases.length; i++) 
			if (cache.elements[e.alias].aliases == id) {
				s = '['+i+']';
				break;
			}
		id = e.alias;
	}
	return cCode(id, e.type)+s;
}

function getName(id) {
	if (!project.elements[id]) return '';
	let x = project.elements[id].code;
	if (!x || x == '') x = '&nbsp';
	return x;
}

function resetProject(crash) {
	var t = new Date();
	project = {meta:{},settings:{},elements:[],bonds:[],viewport:{}};
	project.settings.strict = true;
	project.settings.proportional = false;
	project.meta.timeCreated = t.getTime();
	project.meta.timeSaved = t.getTime();
	project.meta.description = '';
	project.cases = [];
	project.settings.propColor = true;
	update();
	api.initRTS();
	api.initRTSCases();
	api.changed=false;
	api.settings.lastLoaded = undefined;
	selection.tryAllowStuff();
	Recalculate();
	api.showElSel = undefined;
	api.showBSel = undefined;
	if (crash) {
		resetViewport();
		setTimeout(appMain, api.settings.chInterval);
	}
}

function resetViewport() {
	project.viewport.x=0;
	project.viewport.y=0;
	project.viewport.z=0.5;
}

//холст -> экран
function translateCoordsX(i) {
	return (i-project.viewport.x)/project.viewport.z+ctx.canvas.width/2;
}

function translateCoordsY(i) {
	return (i-project.viewport.y)/project.viewport.z+ctx.canvas.height/2;
}

//экран -> холст
function translateCoordsReverseX(i) {
	return (i-ctx.canvas.width/2-0.5/project.viewport.z)*project.viewport.z+project.viewport.x+(i-ctx.canvas.width/2>0?1:0);
}

function translateCoordsReverseY(i) {
	return (i-ctx.canvas.height/2-0.5/project.viewport.z)*project.viewport.z+project.viewport.y+(i-ctx.canvas.height/2>0?1:0);
}

//то же без учета масштаба
function translateCoordsReverseNZX(i) {
	return (i-ctx.canvas.width/2)+project.viewport.x;
}

function translateCoordsReverseNZY(i) {
	return (i-ctx.canvas.height/2)+project.viewport.y;
}

//на связи -> холст
function translateOnBondCoordsX(b, ac) {
	var x = parseFloat(project.elements[project.bonds[b].first].X);
	if (cache.bonds[b].pair != undefined) {
		x += (parseFloat(project.elements[project.bonds[b].second].X) - parseFloat(project.elements[project.bonds[b].first].X)) / 2;
	}
	return x+((parseFloat(project.elements[project.bonds[b].second].X)-x)*ac);
}

function translateOnBondCoordsY(b, ac) {
	var y = parseFloat(project.elements[project.bonds[b].first].Y);
	if (cache.bonds[b].pair != undefined) {
		y += (parseFloat(project.elements[project.bonds[b].second].Y) - parseFloat(project.elements[project.bonds[b].first].Y)) / 2;
	}
	return y+((parseFloat(project.elements[project.bonds[b].second].Y)-y)*ac);
}

function getColor(a) {
	var c = a;
	if (c<-1) c=-1; 
	if (c>1) c=1;
	if (c<-0.5) return 'rgb(0, '+parseInt((255-511*(Math.abs(c)-0.5))/(api.settings.nightMode?1:1.5))+','+(api.settings.nightMode?255:170)+')';
	if (c<0) return 'rgb(0, '+(api.settings.nightMode?255:170)+','+parseInt(511*Math.abs(c)/(api.settings.nightMode?1:1.5))+')';
	if (c<0.5) return 'rgb('+parseInt(511*c/(api.settings.nightMode?1:1.5))+','+(api.settings.nightMode?255:170)+',0)';
	else return 'rgb(255,'+parseInt((255-511*(c-0.5))/(api.settings.nightMode?1:1.5))+',0)';
}

function agetColor(a) {
	var c = a;
	if (c<-1) c=-1; 
	if (c>1) c=1;
	if (c<-0.5) return 'rgb(0, '+parseInt((255-511*(Math.abs(c)-0.5))/(api.settings.nightMode?1:1.5))+','+(api.settings.nightMode?255:170)+',0)';
	if (c<0) return 'rgb(0, '+(api.settings.nightMode?255:170)+','+parseInt(511*Math.abs(c)/(api.settings.nightMode?1:1.5))+',0)';
	if (c<0.5) return 'rgba('+parseInt(511*c/(api.settings.nightMode?1:1.5))+','+(api.settings.nightMode?255:170)+',0,0)';
	else return 'rgba(255,'+parseInt((255-511*(c-0.5))/(api.settings.nightMode?1:1.5))+',0,0)';
}

function colorToA(a, b) {
	return a.replace('rgb','rgba').replace(')',','+(b || 0));
}

function grad(a, b, c) {
	let ac = [], bc = [];
	let s = a.split('(')[1].split(',');
	let sb = b.split('(')[1].split(',');
	for (let i=0; i<3; i++) {
		ac[i] = parseInt(s[i]);
		bc[i] = parseInt(sb[i]);
		
		ac[i] += parseInt((bc[i]-ac[i])*c);
	}
	return 'rgba('+ac[0]+','+ac[1]+','+ac[2]+',1)';
}

function hexToRgb(hex) {
	if (hex.length == 4) hex = '#'+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? ('rgb('+
        parseInt(result[1], 16)+','+
        parseInt(result[2], 16)+','+
        parseInt(result[3], 16)+')')
     : null;
}

function deXSS(s) {
	//по сути, нас только <script> должно пугать
	return s.replace(RegExp('<', 'g'), '&lt;')/*.replace(RegExp('>', 'g'), '&gt;').replace(RegExp('"', 'g'), '&#34;').replace(RegExp("'", 'g'), '&#39;')*/;
}

function gridCoords(i) {
	return parseInt(Math.round(parseInt(i)/zoomprop)*zoomprop);
}

function wrapText(context, text, x, y, maxWidth, lineHeight, fake) {
	let y1 = y;
	if (!text) return;
	var words = text.split(' ');
	var line = '';

	for(var n = 0; n < words.length; n++) {
		var testLine = line + words[n] + ' ';
		var metrics = context.measureText(testLine);
		var testWidth = metrics.width;
		if (testWidth > maxWidth && n > 0) {
			if (!fake) context.fillText(line, x, y);
			line = words[n] + ' ';
			y += lineHeight;
		}
		else {
			line = testLine;
		}
	}
	if (!fake) context.fillText(line, x, y);
	return y+lineHeight-y1;
}
  

function appDrawBond(el,b) {
	if (project.viewport.z>4) ctx.lineWidth = 1;
	else if (project.viewport.z>1) ctx.lineWidth = 2;
	else ctx.lineWidth = 3;
	
	if ((AuxBonds2 != undefined) && api.settings.tooltips && api.brush == 99) {
		ctx.strokeStyle=colorScheme[(api.settings.nightMode?1:0)].actconn;
		if (!isBondUnique(AuxBonds,AuxBonds2) || AuxBonds==AuxBonds2) ctx.strokeStyle=colorScheme[(api.settings.nightMode?1:0)].fakeconn;
		ctx.setLineDash([3, 5]);
		ctx.beginPath();
		ctx.moveTo(translateCoordsX(el[AuxBonds].X),translateCoordsY(el[AuxBonds].Y));
		ctx.lineTo(translateCoordsX(el[AuxBonds2].X),translateCoordsY(el[AuxBonds2].Y));
		ctx.closePath();
		ctx.stroke();
		ctx.setLineDash([1, 0]);
	}
	for (var i=0; i<b.length; i++) {
		if (b[i] == undefined) continue;
		var tx1 = el[b[i].first].X;
		var ty1 = el[b[i].first].Y;
		if (cache.bonds[i].pair != undefined) {
			tx1 += (el[b[i].second].X - el[b[i].first].X) / 2;
			ty1 += (el[b[i].second].Y - el[b[i].first].Y) / 2;
		}
		var x1 = translateCoordsX(tx1), y1 = translateCoordsY(ty1);
		var x2 = translateCoordsX(el[b[i].second].X), y2 = translateCoordsY(el[b[i].second].Y);
		
		//выбрана ли?
		var isSel = (cache.bonds[i].active != 0);
		var tc = (cache.bonds[i].active==1?'actconn':'fakeconn');
		let color1;

		if (isSel) {
			color1 = colorScheme[(api.settings.nightMode?1:0)][tc];
		}
		else {
			if (project.settings.propColor && b[i].act == 'next') color1 = '#0d0';
			else if (project.settings.propColor && b[i].act == 'else') color1 = '#f00';
			else color1 = colorScheme[(api.settings.nightMode?1:0)].connections;
		}
		
		if (color1.startsWith('#')) color1 = hexToRgb(color1);
		
		if (api.settings.transparency) {
			var grd=ctx.createLinearGradient(x1,y1,x2,y2);
			grd.addColorStop(0,api.settings.transparency?colorToA(color1):color1);
			grd.addColorStop(0.3,color1);
			grd.addColorStop(0.7,color1);
			ctx.fillStyle = grd;
			ctx.strokeStyle = grd;
		}
		else {
			ctx.strokeStyle = color1;
			ctx.fillStyle = color1;
			
		}
		
		ctx.beginPath();
		ctx.moveTo(x1,y1);
		ctx.lineTo(x2,y2);
		ctx.closePath();
		ctx.stroke();
		ctx.beginPath();
		var a = -3.14/2-Math.atan2(x1-x2, y1-y2);
		var d = getSize(b[i].second);
		var cx = x2 - d*Math.cos(a);
		var cy = y2 - d*Math.sin(a);
		ctx.moveTo(cx,cy);
		var dx = x2 - d*2*Math.cos(a);
		var dy = y2 - d*2*Math.sin(a);
		
		ctx.lineTo(dx+(getSize(b[i].second)/3*Math.cos(a+3.14/2)),dy+(getSize(b[i].second)/3*Math.sin(a+3.14/2)));
		ctx.lineTo(dx+(getSize(b[i].second)/3*Math.cos(a-3.14/2)),dy+(getSize(b[i].second)/3*Math.sin(a-3.14/2)));
		ctx.lineTo(cx,cy);
		
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}	
	
	// подписи
	if (api.settings.elemLabels || (api.hasActiveElems && api.settings.activeElems)) for (var i=0; i<b.length; i++) {
		//существует
		if (b[i] == undefined) continue;
		
		//выбран ли?
		var isSel = (cache.bonds[i].active != 0);
		if (project.viewport.z>0.8 && !isSel) continue; 
		
		ctx.font = 300+100*(api.settings.nightMode?0:1)+" "+12*api.settings.glFontSize/100+"pt "+(api.settings.cursor?"'Open Sans'":"'Verdana'");
		if (isSel) {
			if (cache.bonds[i].active == 1) ctx.fillStyle = colorScheme[(api.settings.nightMode?1:0)].seltext;
			else ctx.fillStyle = colorScheme[(api.settings.nightMode?1:0)].fakeconnt;
		}
		else ctx.fillStyle = colorScheme[(api.settings.nightMode?1:0)].text;
		ctx.lineWidth = 5;
		ctx.strokeStyle = colorScheme[(api.settings.nightMode?1:0)].stext;
		ctx.textAlign = 'center';
		ctx.strokeText(b[i].act, translateCoordsX(el[b[i].first].X+(el[b[i].second].X - el[b[i].first].X) / 2), 
								 translateCoordsY(el[b[i].first].Y+(el[b[i].second].Y - el[b[i].first].Y) / 2));
		ctx.fillText(b[i].act, translateCoordsX(el[b[i].first].X+(el[b[i].second].X - el[b[i].first].X) / 2), 
							   translateCoordsY(el[b[i].first].Y+(el[b[i].second].Y - el[b[i].first].Y) / 2));
	}
}

function getSize(i) {
	var ac;
	if (i == -1) ac = 1;
	else if (project.elements[i] == undefined) return 1;
	else if (project.elements[i].val == undefined) {
		ac = project.elements[i].z;
	}
	else if (project.settings.proportional && (project.elements[i].val>0)) {
		ac = project.elements[i].val;
		if (ac > 1) ac = 3-2/Math.log(ac);
		else ac = (ac+0.1)*3;
		ac/=2;
	}
	else ac = project.elements[i].z;
	if (project.viewport.z>10) return api.settings.elemSize*ac/10;
	if (project.viewport.z>8) return api.settings.elemSize*ac/8;
	if (project.viewport.z>4) return api.settings.elemSize*ac/4;
	if (project.viewport.z>2) return api.settings.elemSize*ac/3;
	if (project.viewport.z>1) return api.settings.elemSize*ac/2;
	if (project.viewport.z>0.5) return api.settings.elemSize*ac/1.5;
	return api.settings.elemSize*ac;
}

function appDrawElements(el) {
	//пора разгребать
	var size;
	for (var i=0; i<el.length; i++) {
		var j;
		//элемент существует
		if (el[i] == undefined) continue;
		
		//получаем размер
		size = getSize(i);
		
		//получаем коорды
		var x = el[i].X, y = el[i].Y;
		
		//выбран ли?
		var isSelected = (cache.elements[i].active != 0 || selection.elements[i]);
		
		//определяем цвет заливки
		if (el[i].privateColor != "" && el[i].privateColor != "0") {
			ctx.fillStyle = el[i].privateColor;
			ctx.strokeStyle = el[i].privateColor;
		}
		else {
			ctx.fillStyle = api.settings.color[el[i].type-1];
			ctx.strokeStyle = api.settings.color[el[i].type-1];
		}
		
		//выбираем обводку
		ctx.lineWidth = 3;
		if ((api.brush == 99) && (AuxBonds == i)) ctx.strokeStyle = colorScheme[(api.settings.nightMode?1:0)].actconn;
		if (isSelected) {
			if (cache.elements[i].active == 1) ctx.strokeStyle = api.settings.color[6];
			else if (selection.elements[i]) ctx.strokeStyle = colorScheme[(api.settings.nightMode?1:0)].text;
			else ctx.strokeStyle = colorScheme[(api.settings.nightMode?1:0)].fakeconn;
		}
		if ((AuxBonds == i) && api.settings.tooltips) {
			if ((api.brush == 99) && !isBondUnique(AuxBonds,AuxBonds2) || AuxBonds==AuxBonds2) {
				ctx.strokeStyle=colorScheme[(api.settings.nightMode?1:0)].fakeconn;
			}
		}
		
		ctx.beginPath();
		ctx.arc(translateCoordsX(x),translateCoordsY(y), size, 0,6.28);
		ctx.closePath();
		ctx.fill();
		if ((((api.brush == 99) && (AuxBonds == i)) || isSelected) && api.settings.tooltips) ctx.stroke();
		
	}
	// подписи
	if (api.settings.elemLabels || (api.hasActiveElems && api.settings.activeElems)) for (var i=0; i<el.length; i++) {
		//существует
		if (el[i] == undefined) continue;
		
		//выбран ли?
		let isSelected = (cache.elements[i].active != 0);
		if (project.viewport.z>1.5 && !isSelected) continue; 
		
		//получаем коорды
		var x = el[i].X, y = el[i].Y;
		
		ctx.font = 300+100*(api.settings.nightMode?0:1)+" "+12*api.settings.glFontSize/100+"pt "+(api.settings.cursor?"'Open Sans'":"'Verdana'");
		if (isSelected) {
			if (cache.elements[i].active == 1) ctx.fillStyle = colorScheme[(api.settings.nightMode?1:0)].seltext;
			else ctx.fillStyle = colorScheme[(api.settings.nightMode?1:0)].fakeconnt;
		}
		else ctx.fillStyle = colorScheme[(api.settings.nightMode?1:0)].text;
		ctx.lineWidth = 5;
		ctx.strokeStyle = colorScheme[(api.settings.nightMode?1:0)].stext;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'top';
		ctx.strokeText(el[i].code, translateCoordsX(x), translateCoordsY(y)+size*1.07);
		ctx.fillText(el[i].code, translateCoordsX(x), translateCoordsY(y)+size*1.07);
	}
	
	// большой текст
	if (api.settings.elemLabels || (api.hasActiveElems && api.settings.activeElems)) for (let i=0; i<el.length; i++) {
		//существует
		if (el[i] == undefined) continue;
		
		let text;
		let ops = {
			eq:'==',
			not:'!=',
			gt:'>',
			gte:'>=',
			lt:'<',
			lte:'<='
		};
		if (el[i].type == 1 || el[i].type == 2) {
			text = el[i].body;
			if (el[i].type == 1) text = el[i].speaker + ': ' + text;
		}
		else if (el[i].type == 3) text = el[i].key+' '+ops[el[i].op]+' '+el[i].value;
		else if (el[i].type == 4) text = el[i].code;
		else if (el[i].type == 5) text = el[i].enemy;
		else continue;
		
		//выбран ли?
		let isSelected = (cache.elements[i].active != 0);
		if (project.viewport.z>0.33 && !isSelected) continue; 
		
		//получаем коорды
		let x = el[i].X, y = el[i].Y;
		
		ctx.font = 300+100*(api.settings.nightMode?0:1)+" "+9*api.settings.glFontSize/100+"pt "+(api.settings.cursor?"'Open Sans'":"'Verdana'");
		
		ctx.lineWidth = 2;
		ctx.textAlign = 'left';
		
		if (api.settings.transparency) {
			ctx.fillStyle = colorToA(hexToRgb(colorScheme[(api.settings.nightMode?1:0)].stext), 0.7);
			ctx.strokeStyle = colorToA(hexToRgb(colorScheme[(api.settings.nightMode?1:0)].text), 0.3);
		}
		else {
			ctx.fillStyle = colorScheme[(api.settings.nightMode?1:0)].stext;
			ctx.strokeStyle = colorScheme[(api.settings.nightMode?1:0)].text;
		}
		//ctx.textAlign = 'center';
		ctx.textBaseline = 'top';
		let height = wrapText(ctx, text, translateCoordsX(x)-100, translateCoordsY(y)+size*2+5, 200, 13*api.settings.glFontSize/100, true);
		ctx.beginPath();
		ctx.rect(translateCoordsX(x)-104, translateCoordsY(y)+size*2-1, 208, height+10);
		ctx.closePath();
		
		ctx.stroke();
		ctx.fill();
		ctx.fillStyle = colorScheme[(api.settings.nightMode?1:0)].text;
		wrapText(ctx, text, translateCoordsX(x)-100, translateCoordsY(y)+size*2+5, 200, 13*api.settings.glFontSize/100, false);
	}
	
	
	size = getSize(-1);
	if (((api.brush>0 && api.brush<=6)) && api.settings.tooltips) {
		ctx.strokeStyle = api.settings.color[api.brush-1];
		ctx.setLineDash([3, 5]);
		ctx.beginPath();
		if ((api.brush == 4) || (api.brush == 5)) {
			if (tElemX != undefined) ctx.arc(translateCoordsX(translateOnBondCoordsX(tElemX,tElemY)),translateCoordsY(translateOnBondCoordsY(tElemX,tElemY)), size, 0,6.28);
		}
		else ctx.arc(translateCoordsX(tElemX),translateCoordsY(tElemY), size, 0,6.28);
		
		ctx.closePath();
		ctx.stroke();
		ctx.setLineDash([1, 0]);
	}
}


function appRedraw() {
	var f_activeRoadmap = function(roadMap) {
		if (roadMap != undefined) {
			for (var j=0; j<roadMap.length; j++) {
				if ((roadMap[j] == undefined) || (roadMap[j].length==0)) continue;
				for (var k=0; k<roadMap[j][project.settings.currentCase+2].length; k++) {
					var ue = roadMap[j][project.settings.currentCase+2][k];
					cache.elements[ue].active = 2;
					
					//активация связей
					if (k+1<roadMap[j][project.settings.currentCase+2].length) for (var y=0; y<cache.elements[ue].outbonds.length; y++) {
						if (project.bonds[cache.elements[ue].outbonds[y]].second == roadMap[j][project.settings.currentCase+2][k+1]) {
							cache.bonds[cache.elements[ue].outbonds[y]].active = 2;
							break;
						}
					}
				}
			}
		}
	}
	
	// обнуление активных связей
	for (var i=0; i<cache.bonds.length; i++) cache.bonds[i].active = 0;
	
	// активные элементы
	api.hasActiveElems = false;
	for (var i=0; i<cache.elements.length; i++) cache.elements[i].active = 0;
	if (tElem != undefined) {
		var roadMap = cache.elements[tElem].calcRoadMap;
		f_activeRoadmap(roadMap);
		cache.elements[tElem].active = 1;
		api.hasActiveElems = true;
	}
	if (cache.elements[api.showElSel] == undefined) 
		api.showElSel = undefined;
	if (api.showElSel != undefined) {
		cache.elements[api.showElSel].active = 1;
		api.hasActiveElems = true;
	}
	if (api.activeWindow!=undefined && api.activeWindow.startsWith("edite")) {
		var u = document.getElementById(api.activeWindow).getElementsByClassName("cc_id")[0].value;
		var roadMap = cache.elements[u].calcRoadMap;
		cache.elements[u].active = 1;
		f_activeRoadmap(roadMap);
		api.hasActiveElems = true;
	}
	
	// активные связи
	if (cache.bonds[api.showBSel] == undefined) 
		api.showBSel = undefined;
	if (tBond != undefined) {
		cache.bonds[tBond].active = 1;
	}
	if (api.showBSel != undefined) {
		cache.bonds[api.showBSel].active = 1;
	}
	if (api.activeWindow!=undefined && api.activeWindow.startsWith("editb")) {
		var u = document.getElementById(api.activeWindow).getElementsByClassName("cc_id")[0].value;
		cache.bonds[u].active = 1;
	}

	//
	ctx.canvas.width  = window.innerWidth * api.settings.canvasSize / 100;
	ctx.canvas.height = window.innerHeight * api.settings.canvasSize / 100;
	
	var mode = (api.settings.nightMode?1:0);
	var xmax = ctx.canvas.width;
	var ymax = ctx.canvas.height;
	
	ctx.fillStyle = colorScheme[mode].bg;
	ctx.fillRect(0, 0, xmax, ymax);
	
	ctx.strokeStyle = colorScheme[mode].line;
	ctx.lineWidth = 1;

	var x = xmax/2 - project.viewport.x/project.viewport.z;
	var y = ymax/2 - project.viewport.y/project.viewport.z;
	
	var d = 1/project.viewport.z;
	for (zoomprop=1; d<api.settings.elemSize; zoomprop*=3) d = zoomprop/project.viewport.z;
	zoomprop/=3;
	if (zoomprop>20) zoomprop=(zoomprop/2);
	if (!api.settings.showGrid) zoomprop = 1;
	
	if (api.settings.showGrid) {
		ctx.beginPath();
		for (var tx=x; tx>0; tx-=d) {
			ctx.moveTo (parseInt(tx)+0.5,0);
			ctx.lineTo (parseInt(tx)+0.5,ymax);
		}
		for (var tx=x; tx<xmax; tx+=d) {
			ctx.moveTo (parseInt(tx)+0.5,0);
			ctx.lineTo (parseInt(tx)+0.5,ymax);
		}
		for (var ty=y; ty>0; ty-=d) {
			ctx.moveTo (0,parseInt(ty)+0.5);
			ctx.lineTo (xmax,parseInt(ty)+0.5);
		}
		for (var ty=y; ty<ymax; ty+=d) {
			ctx.moveTo (0,parseInt(ty)+0.5);
			ctx.lineTo (xmax,parseInt(ty)+0.5);
		}
		ctx.stroke();
	}
	
	ctx.strokeStyle = colorScheme[mode].coord;
	ctx.lineWidth = 3;
	
	if (x < 20) x = 20;
	if (x > xmax-20) x = xmax-20;
	if (y < 60) y = 60;
	if (y > ymax-60) y = ymax-60;
	
	if (api.settings.redGrid) {
		ctx.beginPath();
		ctx.moveTo (parseInt(x)+0.5,0);
		ctx.lineTo (parseInt(x)+0.5,ymax);
		ctx.moveTo (0,parseInt(y)+0.5);
		ctx.lineTo (xmax,parseInt(y)+0.5);
		ctx.stroke();
	}
	
	appDrawBond(project.elements, project.bonds);
	appDrawElements(project.elements);
	
	if (selection.processing || selection.keep) selection.draw();
	
	api.forceRedraw = false;
}

function appMain() {
	frame++;
	var s = '', s2=20;
	if (frame%s2<s2/2) {
		for (var i=0; i<frame%s2; i++) s+='\u2588';
		for (i; i<s2/2; i++) s+= '\u2591';
	}
	else {
		for (var i=0; i<frame%s2-s2/2; i++) s+='\u2591';
		for (i; i<s2/2; i++) s+= '\u2588';
	}
	document.getElementById('debug_idle').innerHTML = s;
	
	document.getElementById('is_not_saved').style.display = (api.changed?'inline':'none');
	document.getElementById('save_timeout').innerHTML = api.autosaveInterval;
	

	if (api.mouse.button == 1 || api.mouse.button == 4) {
		if (!doMoving.fact) {
			doMoving.fact = true;
			doMoving.act = false;
			doMoving.selectionMove = false;
			doMoving.elem = FindTheClosest(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y),"Element",api.settings.elemSize);
			doMoving.moveElem = (doMoving.elem != undefined && (api.brush == -2 || api.brush == -4) && api.mouse.button == 1);
			if (api.brush == -4 && api.mouse.button == 1) selection.new();
			if (doMoving.moveElem) {
				AuxMove = doMoving.elem;
				doMoving.selectionMove = selection.elements[AuxMove];
				tElemX = parseFloat(project.elements[AuxMove].X);
				tElemY = parseFloat(project.elements[AuxMove].Y);
				
				if (doMoving.selectionMove) {
					for (var i=0; i<project.elements.length; i++) {
						if (project.elements == undefined || isOnBond(i) || !selection.elements[i] || i == AuxMove) continue;
						
						cache.elements[i].oldX = parseFloat(project.elements[i].X);
						cache.elements[i].oldY = parseFloat(project.elements[i].Y);
					}
				}
				
			}
			doMoving.stX = api.mouse.X;
			doMoving.stY = api.mouse.Y;
			doMoving.cStX = project.viewport.x;
			doMoving.cStY = project.viewport.y;
		}
		else if ((Math.abs(doMoving.stX - api.mouse.X) > 10) || (Math.abs(doMoving.stY - api.mouse.Y) > 10)) doMoving.act = true;
		if (doMoving.act) {
			if (doMoving.moveElem) {
				if (!isOnBond(doMoving.elem)) {
					var x = gridCoords(translateCoordsReverseX(api.mouse.X)), y = gridCoords(translateCoordsReverseY(api.mouse.Y));
					if (((project.elements[AuxMove].X != x) || (project.elements[doMoving.elem].Y != y)) && !isElementThere(x,y,AuxMove)) {
						project.elements[AuxMove].X = gridCoords(translateCoordsReverseX(api.mouse.X));
						project.elements[AuxMove].Y = gridCoords(translateCoordsReverseY(api.mouse.Y));
						api.forceRedraw = true;
					}
					if (doMoving.selectionMove) {
						for (var i=0; i<project.elements.length; i++) {
							if (project.elements == undefined || isOnBond(i) || !selection.elements[i] || i == AuxMove) continue;
							x = gridCoords(cache.elements[i].oldX + (translateCoordsReverseX(api.mouse.X) - tElemX));
							y = gridCoords(cache.elements[i].oldY + (translateCoordsReverseY(api.mouse.Y) - tElemY));
							if (isElementThere(x,y,i)) continue;
							
							project.elements[i].X = x;
							project.elements[i].Y = y;
						}
					}
				}
				else {
					var el = FindTheClosestBond(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y),api.settings.elemSize*2);
					if (el != undefined) {
						var el2 = BondPositon(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y),el);
						if (el2 != undefined) {
							project.elements[AuxMove].X  = el; 
							project.elements[AuxMove].Y = el2;
							if (project.elements[AuxMove].Y < 0.05) project.elements[AuxMove].Y = 0.05;
							if (project.elements[AuxMove].Y > 0.95) project.elements[AuxMove].Y = 0.95;
							api.forceRedraw = true;
						}
					}
				}
			}
			else if (selection.processing) {
				selection.update(); 
				api.forceRedraw = true;
			}
			else {
				project.viewport.x = doMoving.cStX - (api.mouse.X - doMoving.stX)*project.viewport.z;
				project.viewport.y = doMoving.cStY - (api.mouse.Y - doMoving.stY)*project.viewport.z;
				api.forceRedraw = true;
			}
			
		}
	}
	else {
		if (doMoving.moveElem && doMoving.act) {
			MoveElement(AuxMove,translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y));
			doMoving.moveElem = false;
		}
		if (selection.processing) selection.complete();
		doMoving.fact = false;
		doMoving.act = false;
	}
	
	if (api.brush == 99 && api.settings.tooltips) {
		AuxBonds2 = FindTheClosest(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y),"Element",api.settings.elemSize); 
		if (AuxBonds2 != dAuxBonds) {
			dAuxBonds = AuxBonds2;
			api.forceRedraw = true;
		}
	}
	if ((api.brush == 97) && !isOnBond(AuxMove)) {
		var x = gridCoords(translateCoordsReverseX(api.mouse.X)), y = gridCoords(translateCoordsReverseY(api.mouse.Y));
		if (((project.elements[AuxMove].X != x) || (project.elements[AuxMove].Y != y)) && !isElementThere(x,y,AuxMove)) {
			project.elements[AuxMove].X = gridCoords(translateCoordsReverseX(api.mouse.X));
			project.elements[AuxMove].Y = gridCoords(translateCoordsReverseY(api.mouse.Y));
			api.forceRedraw = true;
		}
	}
	if (api.brush == 97) {
		var el = FindTheClosestBond(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y),api.settings.elemSize);
        if (el != undefined) {
			var el2 = BondPositon(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y),el);
		    if (el2 != undefined) {
				project.elements[AuxMove].X  = el; 
				project.elements[AuxMove].Y = el2;
				if (project.elements[AuxMove].Y < 0.05) project.elements[AuxMove].Y = 0.05;
				if (project.elements[AuxMove].Y > 0.95) project.elements[AuxMove].Y = 0.95;
				api.forceRedraw = true;
			}
		}
	}
	if ((api.brush == -1 || api.brush == -4) && api.settings.tooltips) {
		el = api.mouse.onCanvas?FindTheClosest(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y),"Element",api.settings.elemSize):undefined;
        if (el != undefined && api.mouse.onCanvas) {
			if (tElem != el) {
				tElem = el;
				tBond = undefined;
				api.forceRedraw = true;
			}
		}	
		else {
			if (tElem != el) {
				tElem = el;
				tBond = undefined;
				api.forceRedraw = true;
			}
		}
	}
	if ((api.brush == -3 || api.brush == -4) && api.settings.tooltips && tElem == undefined) {
		var el = api.mouse.onCanvas?FindTheClosestBond(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y),api.settings.elemSize):undefined;
        if (el != undefined && api.mouse.onCanvas) {
			if (tBond != el) {
				tBond = el;
				tElem = undefined;
				api.forceRedraw = true;
			}
		}	
		else {
			if (tBond != el) {
				tBond = el;
				tElem = undefined;
				api.forceRedraw = true;
			}
		}
	}
	
	if (api.settings.debug) {
		if (api.forceRedraw || api.overDraw) document.getElementById("debug_idle").style.background=colorScheme[(api.settings.nightMode?1:0)].fakeconn;
		else document.getElementById("debug_idle").style.background="";
	}
	if (api.forceRedraw || api.overDraw) {
		appRedraw();
	}
	if (api.enBSel == undefined) api.enBSel = false;
	if (api.enElSel && (api.elSel != api.showElSel)) {
		api.showElSel = api.elSel;
		api.forceRedraw = true;
	}
	
	if (!api.enElSel && (api.showElSel != null)) {
		api.showElSel = null;
		api.forceRedraw = true;
	}
	if (api.enBSel && (api.bSel != api.showBSel)) {
		api.showBSel = api.bSel;
		api.forceRedraw = true;
	}
	if (!api.enBSel && (api.showBSel != null)) {
		api.showBSel = null;
		api.forceRedraw = true;
	}
	
	if (api.messageTimeout > 0) {
		api.messageTimeout-=api.settings.chInterval;
		if (document.getElementById("messages").childNodes.length == 0) api.messageTimeout = 0;
		if (api.messageTimeout <= 0) {
			if (document.getElementById("messages").childNodes.length > 0) document.getElementById("messages").removeChild(document.getElementById("messages").childNodes[0]);
			if (document.getElementById("messages").childNodes.length > 0) api.messageTimeout += 10000;
			else api.messageTimeout = 0;
		}
	}
	
	if (api.settings.autosave != 0) {
		if (api.autosaveInterval > 0) {
			api.autosaveInterval -= api.settings.chInterval;
			if (api.autosaveInterval <= 0) {
				if (project.id == undefined) project.id = '_temp_save';
				try {
					api.save(project.id, true);
					api.autosaveInterval += api.settings.autosave*1000*60;
				}
				catch(ex) {
					if (api.settings.debug) throw ex;
				}
			}
		}
	}
	api.handleZoom();
	setTimeout(appMain, api.settings.chInterval);
}

function appInit() {
	doMoving.fact = false;
	api.changed = false;
	cache.elements = [];
	cache.bonds = [];
	resetProject();
	resetViewport();
	ctx = document.getElementById("c").getContext('2d');
	setTimeout(appMain, api.settings.chInterval);
    api.mouse.onclick[0] = DrawRemoveSelector;
}


function update() {
	Recalculate();
	api.includeElements(document.getElementById("bpad1").getElementsByTagName("table")[0],-1);
	api.includeBonds(document.getElementById("bpad2").getElementsByTagName("table")[0],-1);
	api.changed = true;
	api.forceRedraw = true;
}

function weightsValidate(input, index) {
	if (input[index] < -1) input[index] = -1;
	if (input[index] > 1) input[index] = 1;
	if (input[index+'2'] > 1) input[index+'2'] = 1;
	if (Math.sign(input[index]) != Math.sign(input[index+'2'])) input[index+'2'] *= -1;
	if (Math.abs(input[index+'2']) < Math.abs(input[index])) {
		let t = input[index+'2'];
		input[index+'2'] = input[index];
		input[index] = t;
	}
}

function createAndAddElement(el, isNew) { //createElement already defined >:c
	var e = document.getElementById(el);
	var id = parseInt(e.querySelector('[data-val="id"]').value);
	project.elements[id] = {};
	var elem = project.elements[id];
	readFromEditWindows(e, elem);

	if (cache.elements[id] == undefined) cache.elements[id] = {aliases:[], inbonds:[]};
	
	if (!isNew) api.brush = -4;

	update();
}

function createAndAddBond(el, isNew) {
	var e = document.getElementById(el);
	var id = parseInt(e.getElementsByClassName("cc_id")[0].value);
	project.bonds[id] = {};
	var elem = project.bonds[id];
	readFromEditWindows(e, elem);
	
	if (!isNew) api.brush = -4;
	update();
}

function cancelCreation() {
	api.brush = -4;
	api.forceRedraw = true;
}

function cancelCreationBond() {
	api.brush = -4;
	api.forceRedraw = true;
}

function isElementThere(x,y, ex) {
	for (var i=0; i<project.elements.length; i++) if ((project.elements[i] != undefined) && i != ex) if ((project.elements[i].X == x) && (project.elements[i].Y == y)) return true;
	return false;
}

function isBondUnique(a,b) {
	for (var i=0; i<project.bonds.length; i++) if (project.bonds[i] != undefined) if ((project.bonds[i].first == a) && (project.bonds[i].second == b)) return false;
	return true;
}

function includeNeighbours(id, e) {
	var i, t = true, ec;
	e.innerHTML = "";
	
	for (i=0; i<cache.elements[id].outbonds.length;i++) {
		if (t) {
			e.innerHTML += '<div class="line">Goes to:<br>';
			t = false;
		}
		ec = project.bonds[cache.elements[id].outbonds[i]].second;
		let n = getName(ec);
		if (n == '' || n == ' ' || n == '&nbsp') {
			n = '<i>'+project.bonds[cache.elements[id].outbonds[i]].act+'</i>'
		}
		e.innerHTML += '<div class="b ilb" onclick="editElement('+ec+')">'+n+'<br>';
	}
	if (!t) e.innerHTML += '</div>';
	t = true;
	
	for (i=0; i<cache.elements[id].inbonds.length;i++) {
		if (t) {
			e.innerHTML += '<div class="line">Went from:<br>';
			t = false;
		}
		ec = project.bonds[cache.elements[id].inbonds[i]].first;
		let n = getName(ec);
		if (n == '' || n == '&nbsp') {
			n = '<i>'+project.bonds[cache.elements[id].outbonds[i]].act+'</i>'
		}
		e.innerHTML += '<div class="b ilb" onclick="editElement('+ec+')">'+n+'<br>';
	}
	if (!t) e.innerHTML += '</div>';
}

function fulfillTerms(cc) {
	for (var i=0; i<cc.getElementsByClassName('prefill').length; i++) {
		var u = cc.getElementsByClassName('prefill')[i];
		
		u.innerHTML = '';
		for (var j=0; j<project.cases.length; j++) {
			u.appendChild(InfernoAddElem('span',{className:'autofill b in ilb', dataset:{target:".d input[data-val=\"speaker\"]", alttarget: ".d input[data-val=\"opposite\"]"}, innerHTML:project.cases[j].name},[]));
		}
	}
}

function setVisibility(cc, el) {
	var elements = ['input','textarea','select'];
	for (var i=0; i<cc.querySelectorAll('[data-display-types]').length; i++) {
		var e = cc.querySelectorAll('[data-display-types]')[i];
		var a = JSON.parse(e.dataset.displayTypes);
		e.style.display = (a.indexOf(el.type) != -1)?'block':'none';
		for (var j=0; j<elements.length; j++) {
			for (var k=0; k<e.querySelectorAll(elements[j]).length; k++) {
				e.querySelectorAll(elements[j])[k].dataset.active = (a.indexOf(el.type) != -1)?'true':'false';
			}
		}
	}
}

function prepareEditWindows(cc, el) {
	fulfillTerms(cc);
	for (var i=0; i<cc.querySelectorAll('[data-val]').length; i++) {
		var e = cc.querySelectorAll('[data-val]')[i];

		if (el[e.dataset.val] != undefined || e.dataset.specialInput != undefined) {
			e[e.type=="checkbox"?'checked':'value'] = el[e.dataset.val];
			var thisValue = el[e.dataset.val];
			if (e.dataset.specialInput != undefined) e[e.type=="checkbox"?'checked':(e.tagName=="SELECT"?'selectedIndex':'value')] = eval(e.dataset.specialInput);
			if (e[e.type=="checkbox"?'checked':(e.tagName=="SELECT"?'selectedIndex':'value')] == undefined || ((e.dataset.parse == 'int' || e.dataset.parse == 'float') && isNaN(e.value))) e[e.type=="checkbox"?'checked':(e.tagName=="SELECT"?'selectedIndex':'value')] = e.dataset.default;
			if (e.type == 'checkbox') api.switchElemState(e);
		}
	}
	for (var i=0; i<cc.querySelectorAll('[data-gray]').length; i++) 
		cc.querySelectorAll('[data-gray]')[i].style.display = (project.settings.grayMap?'inline':'none');
}

function readFromEditWindows(cc, el) {
	for (var i=0; i<cc.querySelectorAll('[data-val]').length; i++) {
		var e = cc.querySelectorAll('[data-val]')[i];
		
		if (e.dataset.writeOnly == "true") continue;
		if (e.dataset.active == "false") continue;
		
		if (e.dataset.readCondition != undefined) {
			if (eval(e.dataset.readCondition)) continue;
		}
		
		el[e.dataset.val] = e[e.type=="checkbox"?'checked':'value'];
		if (el[e.dataset.val] == '' && e.dataset.parse != "string") {
			if (e.dataset.default != undefined) el[e.dataset.val] = e.dataset.default;
			else el[e.dataset.val] = 0;
		}
		
		if (e.type != "checkbox") {
			if (e.dataset.parse == "string") el[e.dataset.val] = deXSS(el[e.dataset.val]);
			else if (e.dataset.parse == "int") el[e.dataset.val] = parseInt(el[e.dataset.val]);
			else if (e.dataset.parse == "float") el[e.dataset.val] = parseFloat(el[e.dataset.val].replace(',','.'));
			
			if (isNaN(el[e.dataset.val])) {
				if (e.dataset.parse == "int") el[e.dataset.val] = parseInt(e.dataset.default);
				else if (e.dataset.parse == "float") el[e.dataset.val] = parseFloat(e.dataset.default.replace(',','.'));
			}
		}
		var thisValue = el[e.dataset.val];
		
		if (e.dataset.specialOutput != undefined) el[e.dataset.val] = eval(e.dataset.specialOutput);
		
	}
}

function editElement(id) {
	api.callWindow("","edit",id);
	var e = document.getElementById("edite"+id);
	var el = project.elements[id];
	let n = getName(id);
	if (n == ' ' || n == '') n = '&nbsp;'
	e.getElementsByClassName("h")[0].innerHTML = '<i>'+n+'</i>';
	e.getElementsByClassName("hc")[0].innerHTML = '<i>'+n+'</i>';
	
	prepareEditWindows(e, el);
	
	setVisibility(e, el);
	
	e.getElementsByClassName("cc_color_check").checked = false;
	
	api.includeBonds(e.getElementsByClassName("blist")[0].getElementsByTagName("table")[0],id);
	includeNeighbours(id, e.getElementsByClassName("ellist")[0]);
}

function editBond(id) {
	api.callWindow("","editb",id);
	var e = document.getElementById("editb"+id);
	var el = project.bonds[id];
	e.getElementsByClassName("h")[0].innerHTML = '<i>'+getName(el.first)+' — '+getName(el.second)+'</i>';
	e.getElementsByClassName("hc")[0].innerHTML = '<i>'+getName(el.first)+' — '+getName(el.second)+'</i>';
	
	prepareEditWindows(e, el);
	
	api.includeElements(e.getElementsByClassName("elist")[0].getElementsByTagName("table")[0], id);
}

function AddElement(MouseX,MouseY,onBond) {
	var i, x=MouseX, y=MouseY;
	if (!onBond && x && y) { 
		x=gridCoords(MouseX);
		y=gridCoords(MouseY);
	}
	let type = api.brush;
	if (isElementThere(x,y)) return false;
	for (i=0;1;i++) if (project.elements[i] == undefined) break;
	api.callWindow('inst');
	var e = document.getElementById("inst");
		
	prepareEditWindows(e, {id:i, X:x, Y:y, body:'', code:'', op:'', value:'', key:'', set:'', root_node:false, type:type, privateColor:api.settings.color[type-1], size:1});
	
	setVisibility(e, {type:type});
	
	e.getElementsByClassName("cc_color_check").checked = false;
	
	api.brush = 100;
	return true;
}

function MoveElement(ActualElement,NewX,NewY,rec) {
	var x=(rec?NewX:gridCoords(NewX)), y=(rec?NewY:gridCoords(NewY));
	var i=x, i2=y;
	if (!isOnBond(ActualElement) && (isElementThere(x,y,ActualElement))) return;
	if (isOnBond(ActualElement) && !rec) {
		i = FindTheClosestBond(NewX,NewY,api.settings.elemSize);
        if (i != undefined) i2 = BondPositon(NewX,NewY,i);
	}
	if ((i != undefined) && (i2 != undefined)) {
		project.elements[ActualElement].X=i;
		project.elements[ActualElement].Y=i2;
	}
	api.forceRedraw = true;
	if (api.brush != -4) api.brush = -2;
	if (!rec) {
		api.changed = true;
		Recalculate();
	}
}

function RemoveBond(ActualBond, afterElem) {
	delete project.bonds[ActualBond];
	checkOnBondElements();
	if (!afterElem) update();
}

function AddBond(FirstElement,SecondElement) {
	if (FirstElement == SecondElement) return;
	if (!isBondUnique(FirstElement,SecondElement)) return;
	var i=0;
	for (i=0;1;i++) if (project.bonds[i] == undefined) break;
	api.callWindow('instb');
	var e = document.getElementById("instb");
	e.getElementsByClassName("cc_id")[0].value = i;

	prepareEditWindows(e, {id:i, first:FirstElement, second:SecondElement});

	api.brush = 100;
}

function FindTheClosest(MouseX,MouseY,Type,Max) {
	var Range = Max;
	var TheClosest;
	var Aux1=1.0;
	var Aux2=1.0;
	var Aux3=1.0;
	if (Type == "Element") {
		for (var key=0; key<project.elements.length;key++) {
			if (project.elements[key] == undefined) continue;
			var x = project.elements[key].X, y = project.elements[key].Y;
			Aux1=(x-MouseX)*(x-MouseX);
			Aux2=(y-MouseY)*(y-MouseY);
			Aux3=Math.sqrt(Aux1+Aux2);
			if ((Aux3<Range*project.viewport.z) && (Aux3<=getSize(key)*project.viewport.z)) {
				Range=Aux3;
				TheClosest=key;
			}
		}
	}
	return TheClosest;
	
}

function FindTheClosestBond(MouseX,MouseY,Max) { 
	var Range = Max; 
	var TheClosest; 
	var AuxY1,AuxY2,AuxX1,AuxX2; 
	var AuxA,AuxB,AuxC; 
	var AuxRange; 
	var E,R,T; 

	for (var key=0; key<project.bonds.length;key++) { 
		if (project.bonds[key] == undefined) continue; 
		
		AuxX1=project.elements[project.bonds[key].first].X; 
		AuxY1=project.elements[project.bonds[key].first].Y; 
		if (cache.bonds[key].pair != undefined) {
			AuxX1 += (project.elements[project.bonds[key].second].X - project.elements[project.bonds[key].first].X) / 2;
			AuxY1 += (project.elements[project.bonds[key].second].Y - project.elements[project.bonds[key].first].Y) / 2;
		}
		
		AuxX2=project.elements[project.bonds[key].second].X; 
		AuxY2=project.elements[project.bonds[key].second].Y; 
		AuxA=AuxY1-AuxY2; 
		AuxB=AuxX2-AuxX1; 
		AuxC=(AuxX1*AuxY2-AuxX2*AuxY1); 
		E=Math.sqrt((AuxX1-MouseX)*(AuxX1-MouseX)+(AuxY1-MouseY)*(AuxY1-MouseY)); 
		R=Math.sqrt((AuxX2-MouseX)*(AuxX2-MouseX)+(AuxY2-MouseY)*(AuxY2-MouseY)); 
		T=Math.sqrt((AuxX2-AuxX1)*(AuxX2-AuxX1)+(AuxY2-AuxY1)*(AuxY2-AuxY1)); 
		AuxRange=(Math.abs(AuxA*MouseX+AuxB*MouseY+AuxC))/(Math.sqrt(AuxA*AuxA+AuxB*AuxB)); 
		if (E>T || R>T) AuxRange=Range+1; 
		if (AuxRange<Range/**project.viewport.z*/) { 
			Range=AuxRange; 
			TheClosest=key; 
		} 
	} 
	return TheClosest; 
}


function checkOnBondElements() {
	return;
}

function checkBonds(afterElem) {
	for (var i=0; i<project.bonds.length; i++) 
		if (project.bonds[i] != undefined)
			if ((project.elements[project.bonds[i].first] == undefined) || (project.elements[project.bonds[i].second] == undefined))
				RemoveBond(i, afterElem);
	checkOnBondElements();
}

function RemoveElement(ActualElement, inital) {
	if (cache.elements[ActualElement].aliases.length > 0) {
		var n = cache.elements[ActualElement].aliases[0];
		project.elements[n].alias = -1;
		project.elements[n].name = project.elements[ActualElement].name;
		for (var i=1; i<cache.elements[ActualElement].aliases.length; i++) {
			project.elements[cache.elements[ActualElement].aliases[i]].name = project.elements[n].name+' ['+i+']';
			project.elements[cache.elements[ActualElement].aliases[i]].alias = n;
		}
	}
	delete project.elements[ActualElement];
	if (inital) {
		checkBonds(true);
		update();
	}
}

function BondPositon(MouseX,MouseY,key) {
	var AuxY1,AuxY2,AuxX1,AuxX2,AuxRange,Range;
	AuxX1=project.elements[project.bonds[key].first].X;
    AuxX2=project.elements[project.bonds[key].second].X;
	AuxY1=project.elements[project.bonds[key].first].Y;
	AuxY2=project.elements[project.bonds[key].second].Y;
	
	if (cache.bonds[key].pair != undefined) {
		AuxX1 += (project.elements[project.bonds[key].second].X - project.elements[project.bonds[key].first].X) / 2;
		AuxY1 += (project.elements[project.bonds[key].second].Y - project.elements[project.bonds[key].first].Y) / 2;
	}
	
	AuxRange=Math.sqrt((AuxX1-MouseX)*(AuxX1-MouseX)+(AuxY1-MouseY)*(AuxY1-MouseY));
	Range=Math.sqrt((AuxX1-AuxX2)*(AuxX1-AuxX2)+(AuxY1-AuxY2)*(AuxY1-AuxY2));
	Range=AuxRange/Range; 
	return Range;
}

function applyCombination(term1, term2) {
	var t = api.getTermsPattern(project.settings.term);
	
	return t.rules[term1][term2];
}

function autocalcTermRules(term) {
	term.rules = [];
	for (var i=0; i<term.terms.length; i++) {
		term.rules[i] = [];
		for (var j=0; j<term.terms.length; j++) {
			var a = getValueOfTerm(i, term);
			var b = getValueOfTerm(j, term);
			var x = a * (1 - b);
			term.rules[i][j] = getTermInterval(x,term);
		}
	}
}

function getBondVal(el, caseid, subname) {
	return 0;
}

function getElemState(el, caseid, subname) {
	if (subname == undefined) subname = '';
	if (subname == '2' && !project.settings.grayMap) return undefined;
	var c;
	if (el == undefined) return 0;
	if (typeof el == 'object') el = el.id;
	c = cache.elements[el]['cstate'+subname][caseid];
	return +c.toFixed(fixed_point);
}
	
function Recalculate() {
	var i,j,k;
	cache.bonds = [];
	cache.elements = [];
	cache.types = [];
	for (i=0; i<6; i++) cache.types[i] = [];
	for (i=0; i<project.bonds.length; i++) {
		cache.bonds[i] = {};
		cache.bonds[i].elems = [];
		cache.bonds[i].pair = undefined;
	}
	for (i=0; i<project.bonds.length-1; i++) {
		if (cache.bonds[i].pair == undefined && project.bonds[i] != undefined) {
			for (j=i+1; j<project.bonds.length; j++) {
				if (project.bonds[j] != undefined && (project.bonds[i].first == project.bonds[j].second) && (project.bonds[j].first == project.bonds[i].second)) {
					cache.bonds[i].pair = j;
					cache.bonds[j].pair = i;
				}
			}
		}
	}
	for (i=0; i<project.elements.length;i++) {
		cache.elements[i] = {};
		cache.elements[i].aliases=[];
	}
	for (i=0; i<project.elements.length;i++) { //входящие и исходящие связи
		if (project.elements[i] != undefined) {
			cache.elements[i].outbonds=[];
			cache.elements[i].inbonds=[];
			for (j=0; j<project.bonds.length;j++) {
				if (project.bonds[j] != undefined) {
					if (project.bonds[j].first == i) cache.elements[i].outbonds.push(j);
					if (project.bonds[j].second == i) cache.elements[i].inbonds.push(j);
				}
			}
		   
			var x = project.elements[i].alias, ax = i;
			while (x > -1) {
				ax = x;
				x = project.elements[ax].alias;
			}
			if (project.elements[i].alias > -1) cache.elements[ax].aliases.push(i);
		   
			cache.types[project.elements[i].type].push(i);		//типы элементов
		}
	}
	api.compiled = false;
}

function DrawRemoveSelector() {
	tElem = FindTheClosest(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y),"Element",api.settings.elemSize*3);
	if (api.brush == -4 && tElem != undefined) {
		editElement(tElem);
		selection.processing = false;
	}
	else if (api.brush == -4 && tBond != undefined) {
		editBond(tBond);
	}
	else if (api.brush == 97) MoveElement(AuxMove,translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y));
	else if (api.brush == 99) {
		var el = FindTheClosest(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y),"Element",api.settings.elemSize*3);
		if (el != undefined) AddBond(AuxBonds,el);
	}
	else {
		if (AddElement(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y), false)) 
			api.callPopup2(windows.newElem);
	}
}

function rClickListener(e) {
	tElem = FindTheClosest(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y),"Element",api.settings.elemSize*3);
	
	if (api.brush == -4) {
		var el = FindTheClosest(translateCoordsReverseX(api.mouse.X),translateCoordsReverseY(api.mouse.Y),"Element",api.settings.elemSize*3);
		if (el != undefined) {
			AuxBonds = el;
			api.brush=99;
			api.forceRedraw = true;
		} else {
			selection.reset();
		}
		e.preventDefault();
	}
	else if (api.brush == 99) {
		api.brush = -4;
		api.forceRedraw = true;
		e.preventDefault();
	}
	else if (api.brush == 97) {
		api.brush = -4;
		MoveElement(AuxMove,tElemX,tElemY,true);
		if (doMoving.selectionMove) {
			for (var i=0; i<project.elements.length; i++) {
				if (project.elements == undefined || isOnBond(i) || !selection.elements[i] || i == AuxMove) continue;
				
				project.elements[i].X = cache.elements[i].oldX;
				project.elements[i].Y = cache.elements[i].oldY;
			}
		}
		api.forceRedraw = true;
		e.preventDefault();
	}
}
