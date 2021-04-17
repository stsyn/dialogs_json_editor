const grayMath = {};
grayMath.normalize = x => {
	//выносим знак
	let minus;
	if ((x[0] < 0) || x.minus) minus = true;
	else minus = false;
	
	//копирование и выравнивание
	let a = x.map(v => {return Math.abs(parseFloat(v))});
	a.minus = minus;
	
	//выравнивание
	if (a.length == 1) return a;
	if (a[0] > a[1]) [a[0], a[1]] = [a[1], a[0]];
	return a;
}

grayMath.denormalize = x => {
	//избавляемся от .minus
	let a = x.slice();
	if (x.minus) {
		if (a.length == 2)  [a[0], a[1]] = [-a[1], -a[0]];
		else a[0] = -a[0];
	}
	if (a.length > 1 && a[0] > a[1]) [a[0], a[1]] = [a[1], a[0]];
	return a;
}

grayMath.getWhiteNumber = x => {
	return x.reduce((a, b) => {return a + parseFloat(b)})/x.length;
}

grayMath.getGrayness = x => {
	let mid = grayMath.getWhiteNumber(x);
	return Math.abs(mid - parseFloat(x[0]));
}

grayMath.add = (a, b) => {
	//нормализуем и копируем
	let x = grayMath.normalize(a);
	let y = grayMath.normalize(b);
	
	//а может это вычитание?
	let inverted = (x.minus != y.minus);
	
	//если одно из чисел не серое
	if (x.length == 1 && y.length == 2) x[1] = x[0];
	if (x.length == 2 && y.length == 1) y[1] = y[0];
	
	//клонируем
	let z = x.slice();
	z.minus = x.minus;
	
	y.forEach((e, i) => {
		let index = (inverted ? z.length-i-1 : i);
		z[index] += e * (inverted?-1:1)
		//if (z[index] < 0) z[index] = 0;
	});
	
	return grayMath.denormalize(z);
}

grayMath.multiply = (a, b) => {
	//нормализуем и копируем
	let x = grayMath.normalize(a);
	let y = grayMath.normalize(b);
	
	let c = [];
	let z = [];
	
	//творим
	let minus = (x.minus != y.minus);
	x.forEach(v => {
		y.forEach(w => { c.push(v*w*(minus?-1:1)) })
	});
	
	if (c.length == 1) z[0] = c[0];
	else {
		z[0] = Math.min.apply(Math, c);
		z[1] = Math.max.apply(Math, c);
	}
	
	return z;
}

grayMath.addStack = function() {
	let args = Array.prototype.slice.call(arguments);
	return args.reduce((current, val) => {return grayMath.add(current, val)});
}

grayMath.multiplyStack = function() {
	let args = Array.prototype.slice.call(arguments);
	return args.reduce((current, val) => {return grayMath.multiply(current, val)});
}