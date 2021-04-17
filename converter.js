function adapt() {
	var t = new Date();
	project.settings = {};
	project.meta = {};
	project.elements = [];
	project.bonds = [];
	project.viewport = {};
	project.settings.strict = true;
	project.settings.propColor = true;
	project.meta.timeCreated = t.getTime();
	project.meta.timeSaved = t.getTime();
	project.meta.description = '';
	project.cases = [];
	
	resetViewport();
	
	for (let i in project.speakers) {
		let tmp = {};
		Object.assign(tmp, project.speakers[i]);
		tmp.color = tmp.color.r+','+tmp.color.g+','+tmp.color.b+','+tmp.color.a;
		tmp.name = i;
		project.cases.push(tmp);
	}
	delete project.speakers;
	let intervalx = 60, intervaly = 30;
	let ceid = 0, cbid = 0, cx = 0, cy = 0;
	let index = {};
	let connections = [];
	
	const appendConnection = (a, b, act) => {
		project.bonds.push({first:a, second:b, act, id:cbid});
		cbid++;
	};
	
	const parseNode = (node, name, x, y, first) => {
		let any = false;
		if (name && index[name] !== undefined) {
			if (!first) cy += intervaly;
			return index[name];
		}
		if (name) index[name] = ceid;
		let elem = {
			id:ceid,
			code:name || ' ',
			X:x, Y:cy,
			type:api.structData.elements.types.indexOf(node.kind),
			body:node.body,
			z:1,
			enemy:node.enemy,
			speaker:node.speaker,
			opposite:node.opposite,
			privateColor:"",
			set:'',
			root_node:node.root_node,
		};
    if (elem.code.startsWith('_$auto-')) elem.code = ' ';
    
		const ops = {
			set:'=',
			add:'+=',
			sub:'-=',
			div:'/=',
			mul:'*='
		};
		if (node.set) node.set.forEach(v => {
			elem.set+=v.key+' '+(ops[v.op] || '=')+' '+v.value+'\n';
		});
		ceid++;
		if (node.condition) {
			elem.key = node.condition.key;
			elem.value = node.condition.value;
			elem.op = node.condition.op;
		}
		project.elements.push(elem);

		if (node.next) {
			if (typeof node.next == 'string') {
				if (!index[node.next]) {
					parseNode(project.nodes[node.next], node.next, x+intervalx, cy);
					any = true;
				}
				connections.push({a:elem.id, b:node.next, act:'next'});
			}
			else {
				let nextId = parseNode(node.next, null, x+intervalx, cy);
				any = true;
				appendConnection(elem.id, nextId, 'next');
			}
		}

		if (node.else) {
			if (typeof node.next == 'string') {
				if (!index[node.else]) {
					parseNode(project.nodes[node.else], node.else, x+intervalx, cy);
					any = true;
				}
				connections.push({a:elem.id, b:node.else, act:'else'});
			}
			else {
				let nextId = parseNode(node.else, null, x+intervalx, cy);
				any = true;
				appendConnection(elem.id, nextId, 'else');
			}
		}

		if (node.options) {
			node.options.forEach(vx => {
				if (typeof vx.next == 'string') {
					if (!index[vx.next]) {
						parseNode(project.nodes[vx.next], vx.next, x+intervalx, cy);
						any = true;
					}
					connections.push({a:elem.id, b:vx.next, act:vx.body});
				}
				else {
					let nextId = parseNode(vx.next, null, x+intervalx, cy);
					any = true;
					appendConnection(elem.id, nextId, vx.body);
				}
			});
		}

		if (!any) cy += intervaly;
		return elem.id;
	}
	for (let i in project.nodes) parseNode(project.nodes[i], i, cx, cy, true);
	
	connections.forEach(v => {
		appendConnection(v.a, index[v.b], v.act)
	});
	
	delete project.nodes;
	update();
}

function convert() {
	let d = {nodes:{}, speakers:{}};
  
  const getId = (() => {
    let current = 0;
    return () => '_$auto-' + (current++);
  })();

	project.cases.forEach(v => {
		d.speakers[v.name] = {};
		Object.assign(d.speakers[v.name], v);
		let cc = (d.speakers[v.name].color || '').split(',');
		d.speakers[v.name].color = {r:parseInt(cc[0] || 0), g:parseInt(cc[1] || 0), b:parseInt(cc[2] || 0), a:parseInt(cc[3] || 0)};
		delete d.speakers[v.name].name;
		delete d.speakers[v.name].states;
	});
	
	const createNode = v => {
		let node = {kind:api.structData.elements.types[v.type], root_node:(v.root_node === true)};
		
		if (node.kind == 'dialogue') {
			node.body = v.body;
			node.speaker = v.speaker;
			node.opposite = v.opposite;
		}
		else if (node.kind == 'narration') {
			node.body = v.body;
		}
		else if (node.kind == 'if') {
			node.condition = {
				op:v.op,
				value:v.value,
				key:v.key
			};
		}
		else if (node.kind == 'combat') {
			node.enemy = v.enemy;
		}
		
		let set = [];
		const ops = {
			'=': 'set',
			'+=': 'add',
			'-=': 'sub',
			'/=': 'div',
			'*=': 'mul'
		};
		
		v.set.split('\n').forEach(v => {
			try {
				let x = v.split(' ');
				if (x.length < 3) return;
				let value = parseFloat(x[2]);
				if (isNaN(value)) value = x[2];
				if (x[2] === 'true') value = true;
				if (x[2] === 'false') value = false;
				let op = ops[x[1]] || 'set';
				set.push({
					key:x[0],
					op,
					value
				})
			}
			catch (e) {}
		});
		if (set.length > 0) node.set = set;
		
		let options = [];
		
		cache.elements[v.id].outbonds.forEach(v => {
			let b = project.bonds[v];
			let fname = project.elements[b.second].code;
			if (fname.trim() && fname.trim() !== '&nbsp;') {
				if (b.act == 'next') node.next = fname.trim();
				else if (b.act == 'else') node.else = fname.trim();
				else {
					options.push({body:b.act, next:fname.trim()});
				}
				return;
			}
			let sname = b.act;
			if (b.act == 'next') node.next = createNode(project.elements[b.second]);
			else if (b.act == 'else') node.else = createNode(project.elements[b.second]);
			else {
				options.push({body:b.act, next:createNode(project.elements[b.second])});
			}
		});
		
		if (options.length > 0) node.options = options;
		
		return node;
	}
	
  if (api.settings.alwaysUseCodes || api.settings.simplify) {
    project.elements.forEach(v => {
      if (v && !v.code.trim()) {
        if (api.settings.alwaysUseCodes || (api.settings.simplify && cache.elements[v.id].inbonds.length > 1)) {
          v.code = getId();
        }
      }
    });
  }
	
	project.elements.forEach(v => {
    if (!v) return;
		if (!v.code.trim() || v.code.trim() == '&nbsp;') return;
		d.nodes[v.code.trim()] = createNode(v);
	});
	return d;
}