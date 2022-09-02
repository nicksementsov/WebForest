const { Pool } = require("pg");
const ofor_db = new Pool();

module.exports = 
{
	find_equipment,
	list_equipment,
	add_equipment,
	find_player_equipment,
	modify_player_equipment,
	find_player, 
	find_class,
	list_players,
	// new
	list_characters,
	find_user_by_email
};

function add_equipment(equipment_cat, eqData, callBack) {
	const query = `INSERT INTO ${equipment_cat}_equipment (equipment_name, bonus_str, bonus_dex, bonus_int, bonus_cha) VALUES ($1, $2, $3, $4, $5)`;
	values = [eqData.eqName, eqData.bonStr, eqData.bonDex, eqData.bonInt, eqData.bonCha];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows);
		}
	});
}

function find_equipment(equipment_id, equipment_cat, callBack) {
	const query = `SELECT * FROM ${equipment_cat}_equipment WHERE ${equipment_cat}_equipment_id = $1`;
	const values = [equipment_id];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function list_equipment(equipment_cat, callBack) {
	const query = `SELECT * FROM ${equipment_cat}_equipment`
	ofor_db.query(query, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows);
		}
	});
}

function modify_player_equipment(player_id, equipment_id, equipment_slot, callBack) {
	const query = `UPDATE player_equipment SET ${equipment_slot} = ${equipment_id} WHERE owner_id = ${player_id}`;
	ofor_db.query(query, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res);
		}
	});
}

function find_player_equipment(player_id, callBack) {
	ofor_db.query("SELECT * FROM player_equipment WHERE owner_id = $1", [player_id], (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function find_player(player_id, callBack) {
	ofor_db.query("SELECT * FROM players WHERE player_id = $1", [player_id], (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function find_class(class_id, callBack) {
	ofor_db.query("SELECT * FROM classes WHERE class_id = $1", [class_id], (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function list_players(callBack) {
	ofor_db.query("SELECT player_id, player_name, player_level, class_name FROM players INNER JOIN classes ON player_class = class_id", (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows);
		}
	});
}

// NEW
function list_characters(user_id, callBack) {
	const query = "SELECT character_name, character_level, class_name FROM characters INNER JOIN classes ON characters.class_id = classes.class_id WHERE characters.user_id = $1";
	const values = [user_id];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
 		} else {
 			success: callBack(null, res);
 		}
	});
}

// NEW
function find_user_by_email(user_email, callBack) {
	ofor_db.query("SELECT user_id FROM users WHERE user_email = $1", [user_email], (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res);
		}
	});
}



