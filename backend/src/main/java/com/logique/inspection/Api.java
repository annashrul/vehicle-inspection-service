package com.logique.inspection;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.Map;

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
    public record Item(@JsonProperty("point_code") @Schema(required=true) String pointCode,
                       @Schema(required=true, enumeration={"GOOD","MINOR_DAMAGE","MAJOR_DAMAGE","NOT_INSPECTABLE"}) String condition,
                       @Schema(nullable=true, description="Required and nonblank for NOT_INSPECTABLE") String note,
                       @JsonProperty("photo_refs") @Schema(nullable=true, description="At least one nonblank reference for MAJOR_DAMAGE; null or omitted means empty") List<String> photoRefs) {}
    public record Write(@JsonProperty("vehicle_id") @Schema(required=true) Long vehicleId,
                        @JsonProperty("inspector_name") @Schema(required=true, minLength=1, maxLength=200) String inspectorName,
                        @JsonProperty("has_key") @Schema(required=true) Boolean hasKey, List<Item> items, Integer version) {}
    public record Update(@JsonProperty("vehicle_id") @Schema(description="Optional; must match the existing vehicle") Long vehicleId,
                         @JsonProperty("inspector_name") @Schema(required=true, minLength=1, maxLength=200) String inspectorName,
                         @JsonProperty("has_key") @Schema(required=true) Boolean hasKey,
                         @Schema(description="Replaces all items; omitted or null means empty") List<Item> items,
                         @Schema(required=true, description="Must equal the current server version") Integer version) {
        public Write write() { return new Write(vehicleId,inspectorName,hasKey,items,version); }
    }
    public record Transition(@Schema(required=true, enumeration={"DRAFT","SUBMITTED","APPROVED","RECHECK"}, description="Legal transitions: DRAFT/RECHECK to SUBMITTED; SUBMITTED to APPROVED/RECHECK") String to,
                             @Schema(required=true, minLength=1) String actor, @Schema(nullable=true) String note) {}
    public record SyncBatch(@JsonProperty("device_id") @Schema(required=true, minLength=1) String deviceId,
                            @Schema(required=true, implementation=SyncInput[].class) List<JsonNode> inspections) {}
    public record SyncInput(@JsonProperty("client_id") @Schema(required=true, format="uuid") String clientId,
                            @JsonProperty("base_version") @Schema(nullable=true, description="Null for a new inspection; required to match the server version for updates") Integer baseVersion,
                            @JsonProperty("vehicle_id") @Schema(required=true) Long vehicleId,
                            @JsonProperty("inspector_name") @Schema(required=true, minLength=1, maxLength=200) String inspectorName,
                            @JsonProperty("has_key") @Schema(required=true) Boolean hasKey,
                            @Schema(required=true, enumeration={"DRAFT","SUBMITTED"}, description="SUBMITTED requires all 14 checklist points") String status, List<Item> items) {}
    public record AuditEntry(@JsonProperty("inspection_id") Long inspectionId, String action,
                             @JsonProperty("from_status") @Schema(nullable=true) String fromStatus,
                             @JsonProperty("to_status") @Schema(nullable=true) String toStatus,
                             String actor, Instant at, Map<String,Object> meta) {}
    public record Detail(Long id, @JsonProperty("vehicle_id") Long vehicleId, @JsonProperty("client_id") UUID clientId, @JsonProperty("inspector_name") String inspectorName, @JsonProperty("has_key") boolean hasKey,
                         @Schema(enumeration={"DRAFT","SUBMITTED","APPROVED","RECHECK"}) String status, int version, @JsonProperty("created_at") Instant createdAt, @JsonProperty("updated_at") Instant updatedAt, List<Item> items) {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SyncResult(@JsonProperty("client_id") String clientId,
                             @Schema(enumeration={"CREATED","UPDATED","DUPLICATE","CONFLICT","REJECTED"}) String result,
                             @JsonProperty("inspection_id") Long inspectionId, @JsonProperty("server_version") Integer serverVersion,
                             @JsonProperty("server_status") String serverStatus, List<FieldError> errors) {}
    public record Results(List<SyncResult> results) {}
}
