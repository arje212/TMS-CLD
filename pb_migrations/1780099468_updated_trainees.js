/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("wip2janw3jd5x1l")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tp6lxs9l",
    "name": "company",
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
  const collection = dao.findCollectionByNameOrId("wip2janw3jd5x1l")

  // remove
  collection.schema.removeField("tp6lxs9l")

  return dao.saveCollection(collection)
})
