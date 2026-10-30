package com.logique.inspection;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.*;
import static com.logique.inspection.Api.*;

@ApplicationScoped
public class InspectionService {
    @Inject InspectionRepository inspections;
    @Inject VehicleRepository vehicles;
    @Inject Rules rules;
    @Inject AuditService audit;

    @Transactional public List<Vehicle> vehicles() { return vehicles.list("order by id"); }
    @Transactional public Detail create(Write input) {
        if (input==null) throw ApiException.error(400,"body","Request body is required");
        vehicles.require(input.vehicleId());
        var items=rules.validate(input.inspectorName(),input.hasKey(),input.items(),false);
        Inspection i=new Inspection(); i.clientId=java.util.UUID.randomUUID(); i.vehicleId=input.vehicleId(); i.status="DRAFT"; i.version=1;
        i.createdAt=Instant.now(); i.updatedAt=i.createdAt;
        replace(i,input.inspectorName(),input.hasKey(),items);
        inspections.persistAndFlush(i);
        return i.dto();
    }
    @Transactional public Detail update(long id, Write input) {
        if (input==null) throw ApiException.error(400,"body","Request body is required");
        Inspection i=inspections.required(id,true); rules.editable(i);
        if (input.version()==null) throw ApiException.error(400,"version","Version is required");
        if (input.version()!=i.version) throw ApiException.error(409,"version","Stale version");
        if (input.vehicleId()!=null && !input.vehicleId().equals(i.vehicleId)) throw ApiException.error(400,"vehicle_id","PUT cannot change vehicle");
        var items=rules.validate(input.inspectorName(),input.hasKey(),input.items(),false);
        replace(i,input.inspectorName(),input.hasKey(),items); changed(i);
        return i.dto();
    }
    @Transactional public Detail detail(long id) { return inspections.required(id,false).dto(); }
    @Transactional public Envelope<List<Detail>> list(String status,Long vehicleId,int page,int limit) {
        if (status!=null && !Rules.STATUSES.contains(status)) throw ApiException.error(400,"status","Unknown status");
        if (page<1 || limit<1 || limit>100 || (long)(page-1)*limit>Integer.MAX_VALUE) throw ApiException.error(400,"pagination","page must be positive and limit between 1 and 100");
        if (vehicleId!=null && vehicleId<1) throw ApiException.error(400,"vehicle_id","Vehicle id must be positive");
        return inspections.listing(status,vehicleId,page,limit);
    }
    @Transactional public Detail transition(long id,Transition input) {
        if (input==null) throw ApiException.error(400,"body","Request body is required");
        Inspection i=inspections.required(id,true);
        rules.transition(i.status,input.to());
        if (input.actor()==null || input.actor().isBlank()) throw ApiException.error(400,"actor","Actor is required");
        if (input.to().equals("SUBMITTED")) rules.validate(i.inspectorName,i.hasKey,i.items.stream().map(InspectionItem::dto).toList(),true);
        String from=i.status; i.status=input.to(); changed(i);
        var meta=new HashMap<String,Object>(); meta.put("note",input.note()); meta.put("version",i.version);
        audit.record(i.id,"TRANSITION",from,i.status,input.actor(),meta);
        return i.dto();
    }
    public static void replace(Inspection i,String name,boolean key,List<Item> items) {
        i.inspectorName=name; i.hasKey=key; i.items.clear(); items.forEach(item -> i.items.add(new InspectionItem(item)));
    }
    public static void changed(Inspection i) { i.version++; i.updatedAt=Instant.now(); }
}
