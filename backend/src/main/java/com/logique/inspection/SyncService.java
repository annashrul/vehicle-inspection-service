package com.logique.inspection;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.*;
import static com.logique.inspection.Api.*;

@ApplicationScoped
public class SyncService {
    @Inject ObjectMapper mapper;
    @Inject SyncWorker worker;
    public Results sync(SyncBatch batch) {
        if (batch==null || batch.inspections()==null) throw ApiException.error(400,"inspections","An inspections array is required");
        if (batch.deviceId()==null || batch.deviceId().isBlank()) throw ApiException.error(400,"device_id","Device id is required");
        var results=new ArrayList<SyncResult>();
        for (var node:batch.inspections()) {
            String client=node==null?null:node.path("client_id").asText(null);
            try {
                if (node==null || !node.isObject()) throw ApiException.error(400,"inspection","Inspection must be an object");
                results.add(worker.process(mapper.treeToValue(node,SyncInput.class),batch.deviceId()));
            } catch (ApiException e) { results.add(worker.rejected(client,batch.deviceId(),e.errors)); }
            catch (JsonProcessingException | IllegalArgumentException e) {
                results.add(worker.rejected(client,batch.deviceId(),List.of(new FieldError("inspection","Malformed inspection fields"))));
            }
            // Unexpected infrastructure errors remain 500; never mislabel a database outage as validation failure.
        }
        return new Results(results);
    }
}
