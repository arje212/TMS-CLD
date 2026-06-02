/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("tjj3s0123cpk1n4")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "maacp2jy",
    "name": "time_in",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nuhsgbej",
    "name": "time_out",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("tjj3s0123cpk1n4")

  // remove
  collection.schema.removeField("maacp2jy")

  // remove
  collection.schema.removeField("nuhsgbej")

  return dao.saveCollection(collection)
})
