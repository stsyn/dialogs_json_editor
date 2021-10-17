var selection = {};
selection.elements = [];

selection.new = function() {
	selection.processing = true;
	selection.startX = translateCoordsReverseX(api.mouse.X);
	selection.startY = translateCoordsReverseY(api.mouse.Y);
	selection.update();
}

selection.update = function() {
	selection.currentX = translateCoordsReverseX(api.mouse.X);
	selection.currentY = translateCoordsReverseY(api.mouse.Y);
}

selection.draw = function() {
	ctx.lineWidth = 2;
	ctx.strokeStyle = colorScheme[(api.settings.nightMode?1:0)].actconn;
	ctx.fillStyle = colorScheme[(api.settings.nightMode?1:0)].aactconn.replace(",0)",",0.25)");
	
	ctx.beginPath();
	ctx.rect(translateCoordsX(selection.startX),translateCoordsY(selection.startY),
		translateCoordsX(selection.currentX)-translateCoordsX(selection.startX),
		translateCoordsY(selection.currentY)-translateCoordsY(selection.startY));
	ctx.closePath();
	
	ctx.stroke();
	ctx.fill();
}

selection.isInside = function(el) {
	//I already hate this 
	if (el.X + getSize(el.id)/2 >= selection.startX &&
		el.X - getSize(el.id)/2 <= selection.currentX &&
		el.Y + getSize(el.id)/2 >= selection.startY &&
		el.Y - getSize(el.id)/2 <= selection.currentY)
		return true;
	return false;
}

selection.reset = function() {
	selection.keep = false;
	for (var i=0; i<project.elements.length; i++) {
		if (project.elements[i] == undefined || isOnBond(i)) continue;
		selection.elements[i] = false;
	}
	selection.allowStuff(false);
	api.forceRedraw = true;
}

selection.selectAll = function() {
	selection.keep = true;
	for (var i=0; i<project.elements.length; i++) {
		if (project.elements == undefined || isOnBond(i)) continue;
		selection.elements[i] = true;
	}
	selection.tryAllowStuff();
	api.forceRedraw = true;
}

selection.inverSelection = function() {
	if (!selection.stuffAllowed) return;
	for (var i=0; i<project.elements.length; i++) {
		if (project.elements == undefined || isOnBond(i)) continue;
		selection.elements[i] = !selection.elements[i];
	}
	selection.tryAllowStuff();
	api.forceRedraw = true;
}

selection.allowStuff = function(condition) {
	for (var i=0; i<document.getElementsByClassName('selectionRequired').length; i++) {
		document.getElementsByClassName('selectionRequired')[i].classList[(!condition?'add':'remove')]('na');
	}
	selection.stuffAllowed = condition;
}

selection.tryAllowStuff = function() {
	for (var i=0; i<project.elements.length; i++) {
		if (project.elements == undefined || cache.elements[i] == undefined || isOnBond(i)) continue;
		if (selection.elements[i]) {
			selection.allowStuff(true);
			return;
		}
	}
	selection.allowStuff(false);
}

selection.getBorders = function() {
	var limits = {
		minX:Infinity,
		minY:Infinity,
		maxX:-Infinity,
		maxY:-Infinity,
		centerX:0,
		centerY:0
	};
	for (var i=0; i<project.elements.length; i++) {
		if (project.elements[i] == undefined || cache.elements[i] == undefined || isOnBond(i)) continue;
		if (selection.elements[i]) {
			if (limits.minX > project.elements[i].X) limits.minX = project.elements[i].X;
			if (limits.maxX < project.elements[i].X) limits.maxX = project.elements[i].X;
			if (limits.minY > project.elements[i].Y) limits.minY = project.elements[i].Y;
			if (limits.maxY < project.elements[i].Y) limits.maxY = project.elements[i].Y;
		}
	}
	limits.centerX = (limits.maxX-limits.minX)/2+limits.minX;
	limits.centerY = (limits.maxY-limits.minY)/2+limits.minY;
	return limits;
}

selection.mirror = function(vertical) {
	if (!selection.stuffAllowed) return;
	var limits = selection.getBorders();
	var c = limits[vertical?'centerY':'centerX'];
	for (var i=0; i<project.elements.length; i++) {
		if (project.elements == undefined || isOnBond(i)) continue;
		if (selection.elements[i]) {
			var d = project.elements[i][vertical?'Y':'X'] - c;
			project.elements[i][vertical?'Y':'X'] = c - d;
		}
	}
	api.changed = true;
	api.forceRedraw = true;
	Recalculate();
}

selection.rotate = function(left) {
	if (!selection.stuffAllowed) return;
	var limits = selection.getBorders();
	for (var i=0; i<project.elements.length; i++) {
		if (project.elements == undefined || isOnBond(i)) continue;
		if (selection.elements[i]) {
			var dX = project.elements[i].X - limits.centerX;
			var dY = project.elements[i].Y - limits.centerY;
			
			if (left) {
				project.elements[i].X = project.elements[i].X - dX + dY;
				project.elements[i].Y = project.elements[i].Y - dX - dY;
			}
			else {
				project.elements[i].X = project.elements[i].X - dX - dY;
				project.elements[i].Y = project.elements[i].Y + dX - dY;
			}
		}
	}
	api.changed = true;
	api.forceRedraw = true;
	Recalculate();
}

selection.deleteSelection = function() {
	if (!selection.stuffAllowed) return;
	var limits = selection.getBorders();
	for (var i=0; i<project.elements.length; i++) {
		if (project.elements == undefined || isOnBond(i)) continue;
		if (selection.elements[i]) RemoveElement(i, true);
	}
}

selection.complete = function() {
	selection.processing = false;
	selection.keep = true;
	
	if (selection.startX > selection.currentX) {
		var t = selection.currentX;
		selection.currentX = selection.startX;
		selection.startX = t;
	}
	
	if (selection.startY > selection.currentY) {
		var t = selection.currentY;
		selection.currentY = selection.startY;
		selection.startY = t;
	}
	
	for (var i=0; i<project.elements.length; i++) {
		if (project.elements[i] == undefined || isOnBond(i)) continue;
		if (selection.isInside(project.elements[i])) {
			if (api.brush == -4) selection.elements[i] = true;
		}
		else {
			if (api.brush == -4) selection.elements[i] = false;
		}
	}
	
	selection.tryAllowStuff();
	api.forceRedraw = true;
}
