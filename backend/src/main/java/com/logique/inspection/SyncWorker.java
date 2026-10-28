package com.logique.inspection;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.*;
import static com.logique.inspection.Api.*;

@ApplicationScoped
public class SyncWorker {
    @Inject InspectionRepository inspections;
    @Inject VehicleRepository vehicles;
    @Inject Rules rules;
    @Inject AuditService audit;

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public SyncResult process(SyncInput input,String device) {
        UUID client;
        try {
            client=UUID.fromString(input.clientId());
            if (!client.toString().equalsIgnoreCase(input.clientId())) throw new IllegalArgumentException();
        } catch (Exception e) { throw ApiException.error(400,"client_id","Valid UUID is required"); }
        Inspection i=inspections.byClient(client);
        if (i!=null && rules.identical(i,input)) return result(input,"DUPLICATE",i,null,List.of());
        if (i!=null && (Set.of("APPROVED","SUBMITTED").contains(i.status) || !Objects.equals(input.baseVersion(),i.version))) {
            var errors=List.of(new FieldError("base_version","Server status or version conflicts with payload"));
            audit.record(i.id,"SYNC_CONFLICT",i.status,i.status,device,meta(input,errors));
            return result(input,"CONFLICT",i,i.status,errors);
        }
        // Conflict/duplicate checks deliberately precede payload validation for existing UUIDs.
        if (input.status()==null || !Set.of("DRAFT","SUBMITTED").contains(input.status())) throw ApiException.error(400,"status","Sync status must be DRAFT or SUBMITTED");
        vehicles.require(input.vehicleId());
        var items=rules.validate(input.inspectorName(),input.hasKey(),input.items(),input.status().equals("SUBMITTED"));
        boolean created=i==null;
        String from=created?null:i.status;
        if (created) {
            i=new Inspection(); i.clientId=client; i.version=1; i.createdAt=Instant.now(); i.updatedAt=i.createdAt;
        } else InspectionService.changed(i);
        i.vehicleId=input.vehicleId(); i.status=input.status();
        InspectionService.replace(i,input.inspectorName(),input.hasKey(),items);
        if (created) inspections.persist(i);
        inspections.flush();
        audit.record(i.id,created?"SYNC_CREATED":"SYNC_UPDATED",from,i.status,device,meta(input,List.of()));
        return result(input,created?"CREATED":"UPDATED",i,null,List.of());
    }
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public SyncResult rejected(String client,String device,List<FieldError> errors) {
        Inspection existing=null;
        try { existing=inspections.byClient(UUID.fromString(client)); } catch (IllegalArgumentException | NullPointerException ignored) {}
        var meta=new HashMap<String,Object>(); meta.put("client_id",client); meta.put("errors",errorDocuments(errors));
        audit.record(existing==null?null:existing.id,"SYNC_REJECTED",existing==null?null:existing.status,
            existing==null?null:existing.status,device,meta);
        return new SyncResult(client,"REJECTED",existing==null?null:existing.id,existing==null?null:existing.version,null,errors);
    }
    private static Map<String,Object> meta(SyncInput input,List<FieldError> errors) {
        var meta=new HashMap<String,Object>(); meta.put("client_id",input.clientId()); meta.put("base_version",input.baseVersion());
        meta.put("errors",errorDocuments(errors)); return meta;
    }
    private static List<Map<String,String>> errorDocuments(List<FieldError> errors) {
        return errors.stream().map(e -> Map.of("field",e.field(),"reason",e.reason())).toList();
    }
    private static SyncResult result(SyncInput input,String result,Inspection i,String status,List<FieldError> errors) {
        return new SyncResult(input.clientId(),result,i.id,i.version,status,errors);
    }
}
