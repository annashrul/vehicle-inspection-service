package com.logique.inspection;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class Api {
    private Api() {}
    public record FieldError(String field, String reason) {}
    public record Meta(int page, int limit, long total) {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Envelope<T>(boolean success, String message, T data, Meta meta, List<FieldError> errors) {
        public static <T> Envelope<T> ok(T data, String message) { return new Envelope<>(true, message, data, null, null); }
        public static <T> Envelope<T> list(T data, Meta meta) { return new Envelope<>(true, "Inspections retrieved successfully", data, meta, null); }
        public static Envelope<Void> error(String message, List<FieldError> errors) { return new Envelope<>(false, message, null, null, errors); }
    }
    public record Item(String pointCode, String condition, String note, List<String> photoRefs) {}
    public record Write(Long vehicleId, String inspectorName, Boolean hasKey, List<Item> items, Integer version) {}
    public record Transition(String to, String actor, String note) {}
    public record SyncBatch(String deviceId, List<JsonNode> inspections) {}
    public record SyncInput(String clientId, Integer baseVersion, Long vehicleId, String inspectorName,
                            Boolean hasKey, String status, List<Item> items) {}
    public record Detail(Long id, Long vehicleId, UUID clientId, String inspectorName, boolean hasKey,
                         String status, int version, Instant createdAt, Instant updatedAt, List<Item> items) {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SyncResult(String clientId, String result, Long inspectionId, Integer serverVersion,
                             String serverStatus, List<FieldError> errors) {}
    public record Results(List<SyncResult> results) {}
}
