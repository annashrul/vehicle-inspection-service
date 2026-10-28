package com.logique.inspection;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class Api {
    private Api() {}
    public record FieldError(String field, String reason) {}
    public record Meta(int page, int limit, long total) {}
    public record ErrorBody(boolean success, String message, List<FieldError> errors) {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Envelope<T>(boolean success, String message, T data, Meta meta, List<FieldError> errors) {
        public static <T> Envelope<T> ok(T data, String message) { return new Envelope<>(true, message, data, null, null); }
        public static <T> Envelope<T> list(T data, Meta meta) { return new Envelope<>(true, "Inspections retrieved successfully", data, meta, null); }
        public static ErrorBody error(String message, List<FieldError> errors) { return new ErrorBody(false, message, errors); }
    }
    public record Item(@JsonProperty("point_code") String pointCode, String condition, String note, @JsonProperty("photo_refs") List<String> photoRefs) {}
    public record Write(@JsonProperty("vehicle_id") Long vehicleId, @JsonProperty("inspector_name") String inspectorName, @JsonProperty("has_key") Boolean hasKey, List<Item> items, Integer version) {}
    public record Transition(String to, String actor, String note) {}
    public record SyncBatch(@JsonProperty("device_id") String deviceId, @Schema(implementation=SyncInput[].class) List<JsonNode> inspections) {}
    public record SyncInput(@JsonProperty("client_id") String clientId, @JsonProperty("base_version") Integer baseVersion, @JsonProperty("vehicle_id") Long vehicleId, @JsonProperty("inspector_name") String inspectorName,
                            @JsonProperty("has_key") Boolean hasKey, String status, List<Item> items) {}
    public record Detail(Long id, @JsonProperty("vehicle_id") Long vehicleId, @JsonProperty("client_id") UUID clientId, @JsonProperty("inspector_name") String inspectorName, @JsonProperty("has_key") boolean hasKey,
                         String status, int version, @JsonProperty("created_at") Instant createdAt, @JsonProperty("updated_at") Instant updatedAt, List<Item> items) {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SyncResult(@JsonProperty("client_id") String clientId, String result, @JsonProperty("inspection_id") Long inspectionId, @JsonProperty("server_version") Integer serverVersion,
                             @JsonProperty("server_status") String serverStatus, List<FieldError> errors) {}
    public record Results(List<SyncResult> results) {}
}
