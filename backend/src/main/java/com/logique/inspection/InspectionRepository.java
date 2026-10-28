package com.logique.inspection;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Parameters;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import java.util.*;

@ApplicationScoped
public class InspectionRepository implements PanacheRepository<Inspection> {
    public Inspection required(long id, boolean lock) {
        Inspection found = lock ? findById(id, LockModeType.PESSIMISTIC_WRITE) : findById(id);
        if (found == null) throw ApiException.error(404, "id", "Inspection not found");
        return found;
    }
    public Inspection byClient(UUID clientId) {
        // The transaction advisory lock serializes both absent and existing UUIDs across instances.
        getEntityManager().createNativeQuery("select 1 from pg_advisory_xact_lock(hashtextextended(cast(:key as text), 0))")
            .setParameter("key", clientId.toString()).getSingleResult();
        return find("clientId", clientId).withLock(LockModeType.PESSIMISTIC_WRITE).firstResult();
    }
    public Api.Envelope<List<Api.Detail>> listing(String status, Long vehicleId, int page, int limit) {
        var parameters = new HashMap<String,Object>();
        var filters = new ArrayList<String>();
        if (status != null) { filters.add("status = :status"); parameters.put("status",status); }
        if (vehicleId != null) { filters.add("vehicleId = :vehicleId"); parameters.put("vehicleId",vehicleId); }
        String where = filters.isEmpty() ? "" : " where " + String.join(" and ", filters);
        // Count and IDs avoid joining item rows before applying OFFSET/LIMIT.
        var countQuery = getEntityManager().createQuery("select count(i) from Inspection i"+where, Long.class);
        var idQuery = getEntityManager().createQuery("select i.id from Inspection i"+where+" order by updatedAt desc, id desc", Long.class);
        parameters.forEach((k,v) -> { countQuery.setParameter(k,v); idQuery.setParameter(k,v); });
        long total = countQuery.getSingleResult();
        var ids = idQuery.setFirstResult(Math.toIntExact((long)(page-1)*limit)).setMaxResults(limit).getResultList();
        if (ids.isEmpty()) return Api.Envelope.list(List.of(), new Api.Meta(page,limit,total));
        var rows = find("select distinct i from Inspection i left join fetch i.items where i.id in :ids", Parameters.with("ids",ids)).list();
        var byId = new HashMap<Long, Inspection>(); rows.forEach(i -> byId.put(i.id,i));
        return Api.Envelope.list(ids.stream().map(id -> byId.get(id).dto()).toList(), new Api.Meta(page,limit,total));
    }
}
