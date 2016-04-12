var matrix;
var canvas
var previewbox;
var rotated = false;
var cell_dim_px = 40;
var bt_handle;

window.onload = function() {
	recreate_matrix();

	previewbox = document.getElementById("preview");

	canvas = document.getElementById("draw");
	canvas.addEventListener('click', function(event) {
		var x;
		var y;
		if (event.x != undefined && event.y != undefined) {
			x = event.x;
			y = event.y;
		}
		else { // Firefox method to get the position
			x = event.clientX
				+ (document.body.scrollLeft || 0)
				+ (document.documentElement.scrollLeft || -10);
			y = event.clientY
				+ (document.body.scrollTop || 0)
				+ (document.documentElement.scrollTop || -10);
		}
		x -= canvas.offsetLeft;
		y -= canvas.offsetTop;
		var row = Math.floor(y / cell_dim_px);
		var col = Math.floor(x / cell_dim_px);
		if (rotated) {
			var tmp = col;
			col = row;
			row = 7 - tmp;
		}

		matrix[row][col] = !matrix[row][col];
		canvas_redraw();
		calc_string_and_send();
	}, false);

	canvas_redraw();
	calc_string_and_send();
}

function recreate_matrix() {
	matrix = new Array(8);
	for (var row = 0; row < 8; row++) {
		matrix[row] = new Array(16);
		for (var col = 0; col < 16; col++)
			matrix[row][col] = false;
	}
}

function fill_matrix(bt_arr) {
	recreate_matrix();

	var idx = 0;

	for (var row = 0; row < 8; row++) {
		var val = bt_arr[idx].charCodeAt(0);
		for (var col = 0; col < 8; col++)
			matrix[row][col] = ((val & 1 << col) > 0);

		idx++;

		val = bt_arr[idx].charCodeAt(0);
		for (var col = 0; col < 8; col++)
			matrix[row][col + 8] = ((val & 1 << col) > 0);

		idx++;
	}
}

function reset() {
	recreate_matrix();
	canvas_redraw();
	calc_string_and_send();
}

function canvas_redraw() {
	var ctx = canvas.getContext("2d");
	ctx.shadowColor = '#f00';
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	var cell_offset = 3;
	var cell_radius = (cell_dim_px - cell_offset * 2) / 2;
	for (var row = 0; row < 8; row++) {
		for (var col = 0; col < 16; col++) {
			if (matrix[row][col]) {
				ctx.fillStyle = "#ff0000";
				ctx.shadowBlur = 20;
			}
			else {
				ctx.fillStyle = "#ffefd5";
				ctx.shadowBlur = 0;
			}

			ctx.beginPath();
			ctx.arc(
				cell_offset + col * cell_dim_px + cell_radius,
				cell_offset + row * cell_dim_px + cell_radius,
				cell_radius,
				0, 2 * Math.PI);
			ctx.fill();
		}
	}

	previewbox.style.background='url('+canvas.toDataURL()+')'
}

function calc_string_and_send() {
	var result_array = [];
	for (var row = 0; row < 8; row++) {
		var val = 0;
		for (var col = 0; col < 8; col++)
			val += (matrix[row][col] ? 1 : 0) * Math.pow(2, col);

		result_array.push(val);

		val = 0;
		for (var col = 8; col < 16; col++)
			val += (matrix[row][col] ? 1 : 0) * Math.pow(2, col - 8);

		result_array.push(val);
	}

	var textfield = document.getElementById("result");
	textfield.value = result_array.toString();

	bt_send(result_array);
}

function rotate() {
	var canvas = document.getElementById('draw').classList.toggle('rotated');
	var canvas_container = document.getElementById('draw-container').classList.toggle('rotated');
	rotated = !rotated;
}

function bt_connect() {
	var device;
	var server;
	var primaryService;

	var serviceUuid = document.getElementById('service').value;
	var serviceUuid = "battery_service";
	if (serviceUuid.startsWith('0x'))
		serviceUuid = parseInt(serviceUuid, 16);

	var characteristicUuid = document.getElementById('characteristic').value;
	if (characteristicUuid.startsWith('0x'))
		characteristicUuid = parseInt(characteristicUuid, 16);

	var devicename = document.getElementById('devicename').value;


	try {
		console.log('Requesting Bluetooth Device...');
		device = window.navigator.bluetooth.requestDevice({
			filters: [{
				services: [serviceUuid],
				name: devicename
			}]
		});
		if (!device)
			throw 'Device not found';

		console.log('Connecting to GATTserver on device...');
		server = device.gatt.connect();
		if (!server)
			throw 'Server not found on device';
		if (!server.connected)
			throw 'Server not connected';

		console.log('Requesting Primary Service...');
		primaryService = server.getPrimaryService(serviceUuid);
		if (!primaryService)
			throw 'Primary Service not found';

		console.log('Requesting Characteristic...');
		bt_handle = primaryService.getCharacteristic(characteristicUuid);
		if (!bt_handle)
			throw 'Characteristic not found';
		console.log('Found a Characteristic!');
	}
	catch(err) {
		console.log(err);
		return;
	}

	var read_arr = bt_handle.readValue();
	fill_matrix(read_arr);
	canvas_redraw();
}

function bt_connect_default() {
	var device;
	var server;
	var primaryService;

	try {
		console.log('Requesting Bluetooth Device...');
		device = window.navigator.bluetooth.requestDevice();
		if (!device)
			throw 'Device not found';

		console.log('Connecting to GATTserver on device...');
		server = device.gatt.connect();
		if (!server)
			throw 'Server not found on device';
		if (!server.connected)
			throw 'Server not connected';

		console.log('Requesting Primary Service...');
		primaryService = server.getPrimaryService();
		if (!primaryService)
			throw 'Primary Service not found';

		console.log('Requesting Characteristic...');
		bt_handle = primaryService.getCharacteristic();
		if (!bt_handle)
			throw 'Characteristic not found';
		console.log('Found a Characteristic!');
	}
	catch(err) {
		console.log(err);
	}
}

function bt_send(arr) {
	if (bt_handle)
		bt_handle.writeValue(arr);
}
