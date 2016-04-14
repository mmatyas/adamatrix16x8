var matrix;
var canvas
var rotated = false;
var cell_dim_px = 40;
var bt_handle;
var log_box;

window.onload = function() {
	log_box = document.getElementById("log");

	recreate_matrix();

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
				+ (document.documentElement.scrollLeft || 0);
			y = event.clientY
				+ (document.body.scrollTop || 0)
				+ (document.documentElement.scrollTop || 0);
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


	if (!window.navigator.bluetooth)
		log("Warning: The WebBluetooth API is not available in this browser!");
}

function log(string) {
	log_box.value += string + "\n";
	log_box.scrollTop = log_box.scrollHeight;
}

function recreate_matrix() {
	matrix = new Array(8);
	for (var row = 0; row < 8; row++) {
		matrix[row] = new Array(16);
		for (var col = 0; col < 16; col++)
			matrix[row][col] = false;
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

	var textfield = document.getElementById("result_field");
	textfield.value = result_array.toString();

	bt_send(result_array);
}

function rotate() {
	var canvas = document.getElementById('draw').classList.toggle('rotated');
	var canvas_container = document.getElementById('draw-container').classList.toggle('rotated');
	rotated = !rotated;
}

function flip() {
	for (var row = 0; row < 4; row++) {
		var tmp_row = matrix[row];
		matrix[row] = matrix[7 - row];
		matrix[7 - row] = tmp_row;
	}
	canvas_redraw();
	calc_string_and_send();
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
		log_box.value = "";
		if (!window.navigator.bluetooth)
			throw 'The WebBluetooth API is not available in this browser!';

		log('Requesting Bluetooth Device...');
		device = window.navigator.bluetooth.requestDevice({
			filters: [{
				services: [serviceUuid],
				name: devicename
			}]
		});
		if (!device)
			throw 'Device not found';

		log('Connecting to GATTserver on device...');
		server = device.gatt.connect();
		if (!server)
			throw 'Server not found on device';
		if (!server.connected)
			throw 'Server not connected';

		log('Requesting Primary Service...');
		primaryService = server.getPrimaryService(serviceUuid);
		if (!primaryService)
			throw 'Primary Service not found';

		log('Requesting Characteristic...');
		bt_handle = primaryService.getCharacteristic(characteristicUuid);
		if (!bt_handle)
			throw 'Characteristic not found';
		log('Found a Characteristic!');

		var read_arr = bt_handle.readValue();
		if (read_arr)
			throw "Failed to read value"

		fill_matrix(read_arr);
		canvas_redraw();
	}
	catch(err) {
		log("Error: " + err);
		return;
	}
}

function bt_send(arr) {
	if (bt_handle)
		bt_handle.writeValue(arr);
}
