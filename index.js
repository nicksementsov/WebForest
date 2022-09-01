const path = require("path");
const express = require("express");
const db_manager = require("./ofor_db");

const app = express();
const PORT = 8080;

app.use(express.urlencoded({ extended: true }));

app.use('/static', express.static(path.join(__dirname, "/static")));
app.use('/js', express.static(path.join(__dirname, '/js')));

app.use('/css', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/js')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/@popperjs/core/dist/umd')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.get('/newplayer/', (req, res) => {
	res.render('newplayer',{title: 'Create New Player'});
});

app.post('/alterplayer', (req, res) => {
	const ourPlayerID = parseInt(req.body.plID);
	const ourItemID = parseInt(req.body.eqID);
	const ourSlot = req.body.eqSlot;
	db_manager.modify_player_equipment(ourPlayerID, ourItemID, ourSlot, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			res.redirect(301, `/player/${ourPlayerID}`);
		}
	});
});

// Builds a full player including stats and equipment
function build_player(player_id, callBack) {
	var equipment_slots = 
	[
		"head",
		"body",
		"leg",
		"hand",
		"feet"
	];
	equipment = [];
	var ourPlayer = [];
	var viewPlayer = [];

	function get_equipment(onSlot) {
		if (onSlot < equipment_slots.length) {
			db_manager.find_equipment(ourPlayer[2][equipment_slots[onSlot]], equipment_slots[onSlot], (err, result) => {
				if (err) {
					callBack(err, null);
				} else {
					equipment.push(result);
					get_equipment(onSlot + 1);
				}
			});
		} else {
			viewPlayer = {
				player_id: ourPlayer[0].player_id,
				player_name: ourPlayer[0].player_name.trim(),
				player_level: ourPlayer[0].player_level,
				class_name: ourPlayer[1].class_name.trim(),
				player_str: 0 + ourPlayer[1].base_str,
				player_int: 0 + ourPlayer[1].base_int,
				player_dex: 0 + ourPlayer[1].base_dex,
				player_cha: 0 + ourPlayer[1].base_cha,
				player_equ: equipment
			}
			for (let equipmentItem of equipment) {
				viewPlayer.player_str += equipmentItem.bonus_str;
				viewPlayer.player_dex += equipmentItem.bonus_dex;
				viewPlayer.player_int += equipmentItem.bonus_int;
				viewPlayer.player_cha += equipmentItem.bonus_cha;
			}
			callBack(null, viewPlayer);
		}
	}

	db_manager.find_player(parseInt(player_id), (err, result) => {
		if (err) {
			callBack(err, null);
		} else {
			db_manager.find_class(result.player_class, (classErr, classResult) => {
				if (classErr) {
					callBack(err, null);
				} else {
					db_manager.find_player_equipment(parseInt(player_id), (eqErr, eqResult) => {
						ourPlayer.push(result);
						ourPlayer.push(classResult);
						ourPlayer.push(eqResult);
						get_equipment(0);
					});
				}
			});
		}
	});

}

app.get('/player/:player_id', (req, res) => {
	const { player_id } = req.params;
	build_player(player_id, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			res.render('viewplayer', {title: result.player_name, player: result});
		}
	});
});

app.post('/additem', (req, res) => {
	db_manager.add_equipment(req.body.slot, req.body, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			res.redirect(301, `/list/${req.body.slot}`);
		}
	});
});

app.get('/list/:category', (req, res) => {
	const { category } = req.params;
	var picking = false;
	var ourPlayer = 0;
	if (req.query.p === 'true') {
		picking = true;
		ourPlayer = parseInt(req.query.pid);
	}
	db_manager.list_equipment(category, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			const pageTitle = `${category} Equipment List`
			res.render('tablelist', {title: pageTitle, slot: category, equipment: result, picking: picking, ourPlayer: ourPlayer});
		}
	});
});

app.get('/players', (req, res) => {
	db_manager.list_players((err, result) => {
		if (err) {
			console.log(err);
		} else {
			var ourPlayers = [];
			for (let player of result) 
			{
				ourPlayers.push(
					{
						id: player.player_id
						, name: player.player_name.trim()
						, level: player.player_level
						, class: player.class_name
					});
			}
			res.render('playerlist', {title: 'Player List', players: ourPlayers});
		}
	});
});

app.post('/login', (req, res) => {
	console.log(req.body);
	res.redirect(301, '/login');
});

app.get('/login', (req, res) => {
	res.render('login', {title: "Login"});
});

app.get('/', (req, res) => {
	res.render('index', {title: "Home"});
});

app.listen(PORT, () => {
	const strin = `listening on port: ${PORT}`;
	console.log(strin);
});