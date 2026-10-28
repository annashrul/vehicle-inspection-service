package com.logique.inspection;

import com.mongodb.client.MongoClient;
import com.mongodb.client.model.UpdateOptions;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.bson.Document;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import java.time.Instant;
import java.util.*;

@ApplicationScoped
public class AuditService {
    @Inject EntityManager em;
    @Inject MongoClient mongo;
    @ConfigProperty(name="quarkus.mongodb.database") String database;

    @Transactional(Transactional.TxType.MANDATORY)
    public void record(Long id, String action, String from, String to, String actor, Map<String,Object> meta) {
        AuditEvent event=new AuditEvent(); event.id=UUID.randomUUID(); event.inspectionId=id; event.createdAt=Instant.now();
        event.payload=new Document("_id",event.id.toString()).append("inspection_id",id).append("action",action)
            .append("from_status",from).append("to_status",to).append("actor",actor)
            .append("at",event.createdAt.toString()).append("meta",new Document(meta)).toJson();
        em.persist(event);
    }
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void deliver() { deliverPending(null); }
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void deliverFor(long id) { deliverPending(id); }
    private void deliverPending(Long id) {
        // SKIP LOCKED allows multiple instances to drain without blocking one another.
        var query=em.createNativeQuery("select * from audit_outbox where delivered_at is null" + (id==null ? "" : " and inspection_id = :id") + " order by created_at, id" + (id==null ? " limit 500" : "") + " for update",AuditEvent.class);
        if (id!=null) query.setParameter("id",id);
        var pending=query.getResultList();
        for (Object row:pending) {
            AuditEvent event=(AuditEvent)row;
            Document document=Document.parse(event.payload);
            // Upsert only on first insertion: the audit document is never modified on retry.
            mongo.getDatabase(database).getCollection("audit").updateOne(new Document("_id",event.id.toString()),
                new Document("$setOnInsert",document),new UpdateOptions().upsert(true));
            event.deliveredAt=Instant.now();
        }
    }
    public List<Document> history(long id) {
        return mongo.getDatabase(database).getCollection("audit").find(new Document("inspection_id",id))
            .sort(new Document("at",1).append("_id",1)).projection(new Document("_id",0)).into(new ArrayList<>());
    }
}
