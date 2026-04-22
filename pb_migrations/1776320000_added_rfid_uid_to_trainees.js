/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("wip2janw3jd5x1l")

  // Add rfid_uid field
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rfiduid01",
    "name": "rfid_uid",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": true,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("wip2janw3jd5x1l")

  // Remove rfid_uid field
  collection.schema.removeField("rfiduid01")

  return dao.saveCollection(collection)
})
