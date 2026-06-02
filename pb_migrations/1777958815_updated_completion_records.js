/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("6ymjgx2xazhdeha")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "f4f9xfex",
    "name": "batch",
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
    "id": "g5zcxgxc",
    "name": "remarks",
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
    "id": "4oneftco",
    "name": "training_title",
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
  const collection = dao.findCollectionByNameOrId("6ymjgx2xazhdeha")

  // remove
  collection.schema.removeField("f4f9xfex")

  // remove
  collection.schema.removeField("g5zcxgxc")

  // remove
  collection.schema.removeField("4oneftco")

  return dao.saveCollection(collection)
})
