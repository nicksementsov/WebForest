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
	find_equipment_item,
	find_character_equipment,
	list_characters,
	find_character_by_id,
	find_user_by_email,
	find_user_by_id
};



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

var equipment_slots = 
[
	"head", 
	"body", 
	"leg", 
	"hand", 
	"feet",
	"arms",
	"arms"
];

function add_equipment(equipment_cat, eqData, callBack) {
	const query = `INSERT INTO ${equipment_cat}_equipment (equipment_name, equipment_level, equipment_str, equipment_int, equipment_dex, equipment_cha) VALUES ($1, $2, $3, $4, $5, $6)`;
	values = [eqData.eqName, eqData.eqLevel, eqData.eqStr, eqData.eqDex, eqData.eqInt, eqData.eqCha];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows);
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

function find_equipment_item(itemID, category, callBack) {
	const query = `SELECT * FROM ${equipment_slots[category]}_equipment WHERE equipment_id = $1`;
	const values = [itemID];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function find_character_equipment(charID, callBack) {
	const query = "SELECT * FROM character_equipment WHERE character_id = $1";
	values = [charID];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function find_character_by_id(charID, callBack) {
	const query = "SELECT * FROM characters WHERE character_id = $1";
	const values = [charID];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function list_characters(user_id, callBack) {
	const query = "SELECT * FROM characters INNER JOIN classes ON characters.class_id = classes.class_id WHERE characters.user_id = $1";
	const values = [user_id];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
 		} else {
 			success: callBack(null, res.rows);
 		}
	});
}

function find_user_by_email(user_email, callBack) {
	ofor_db.query("SELECT user_id FROM users WHERE user_email = $1", [user_email], (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function find_user_by_id(userID, callBack) {
	ofor_db.query("SELECT * FROM users WHERE user_id = $1", [userID], (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}
