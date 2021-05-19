# Precomputed Flat Directed Acyclic Graph

JSON event batch



EventTags
    Create
    Update
    Delete

Event
    Type(Create, Update, Delete)



.HumanVisuals
    Name
    Desc

.SimpleAudit
    CreatedAt
    ModifiedAt

.TenantRoot
    TenantID

.Attr
    Attr(AttrID)
        .HumanVisuals
        .SimpleAudit
        .Payload
        .SoftDeletes
    AttrLink(ID)
        AttrID
        .SimpleAudit
        .Payload

.DAG
    DAG(ID, Level)
        ParentID

.Payload
    Payload

.SoftDeletes
    DeletedAt

Dimension(ID)
    .TenantRoot
    .HumanVisuals
    .SimpleAudit
    .Payload
    .SoftDeletes
    .Attr
    .DAG

Transaction(ID)



