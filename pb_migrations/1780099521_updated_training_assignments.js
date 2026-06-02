/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("q7f5csiv44j16fv")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qqsqfb0b",
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
  const collection = dao.findCollectionByNameOrId("q7f5csiv44j16fv")

  // remove
  collection.schema.removeField("qqsqfb0b")

  return dao.saveCollection(collection)
})
