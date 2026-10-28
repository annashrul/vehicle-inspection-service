package com.logique.inspection;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.*;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class ContractTest {
    @Inject ObjectMapper mapper;
    Map<String,Object> draft() {
        return new HashMap<>(Map.of("vehicle_id",1,"inspector_name","Test inspector","has_key",true,"items",List.of()));
    }
    Map<String,Object> syncInput() {
        var input=draft(); input.put("client_id",UUID.randomUUID().toString()); input.put("status","DRAFT"); return input;
    }
    List<Map<String,Object>> complete() throws Exception {
        var result=new ArrayList<Map<String,Object>>();
        for (var point:mapper.readTree(getClass().getResourceAsStream("/checklist.json")).path("vehicle_types").path("CAR"))
            result.add(Map.of("point_code",point.path("point_code").asText(),"condition","GOOD","photo_refs",List.of()));
        return result;
    }
    long create(Map<String,Object> input) {
        return given().contentType("application/json").body(input).post("/api/v1/inspections").then().statusCode(201).extract().jsonPath().getLong("data.id");
    }
    io.restassured.response.ValidatableResponse sync(List<?> input) {
        return given().contentType("application/json").body(Map.of("device_id","test-tablet","inspections",input))
            .post("/api/v1/inspections/sync").then().statusCode(200);
    }
    @Test void vehiclesHealthAndEnvelope() {
        given().get("/api/v1/vehicles").then().statusCode(200).header("X-Request-ID",not(emptyString())).body("data.size()",is(20)).body("data[0].plate_number",notNullValue());
        given().get("/q/health/ready").then().statusCode(200).body("status",is("UP"));
        given().get("/q/openapi").then().statusCode(200);
    }
    @Test void validationR1R2R3() {
        var input=draft(); input.put("vehicle_id",999999);
        given().contentType("application/json").body(input).post("/api/v1/inspections").then().statusCode(404);
        input.put("vehicle_id",1); input.put("has_key",false); input.put("items",List.of(Map.of("point_code","ENG_BAY","condition","GOOD")));
        given().contentType("application/json").body(input).post("/api/v1/inspections").then().statusCode(400).body("errors.field",hasItem("items.ENG_BAY.condition"));
        input.put("items",List.of(Map.of("point_code","ENG_BAY","condition","NOT_INSPECTABLE"),Map.of("point_code","EXT_FRONT","condition","MAJOR_DAMAGE")));
        given().contentType("application/json").body(input).post("/api/v1/inspections").then().statusCode(400).body("errors.field",hasItems("items.ENG_BAY.note","items.EXT_FRONT.photo_refs"));
        input.put("items",List.of(Map.of("point_code","BAD","condition","BAD")));
        given().contentType("application/json").body(input).post("/api/v1/inspections").then().statusCode(400);
    }
    @Test void missingPointsAndIllegalTransition() {
        long id=create(draft());
        given().contentType("application/json").body(Map.of("to","SUBMITTED","actor","test")).post("/api/v1/inspections/"+id+"/transition").then().statusCode(400).body("errors.size()",is(14));
        given().contentType("application/json").body(Map.of("to","APPROVED","actor","test")).post("/api/v1/inspections/"+id+"/transition").then().statusCode(409);
        given().contentType("application/json").body(Map.of("to","UNKNOWN","actor","test")).post("/api/v1/inspections/"+id+"/transition").then().statusCode(400);
    }
    @Test void transitionsVersionsAndAudit() throws Exception {
        var input=draft(); input.put("items",complete()); long id=create(input); input.put("version",1);
        given().contentType("application/json").body(input).put("/api/v1/inspections/"+id).then().statusCode(200).body("data.version",is(2));
        given().contentType("application/json").body(input).put("/api/v1/inspections/"+id).then().statusCode(409);
        for (String to:List.of("SUBMITTED","RECHECK","SUBMITTED","APPROVED"))
            given().contentType("application/json").body(Map.of("to",to,"actor","supervisor")).post("/api/v1/inspections/"+id+"/transition").then().statusCode(200);
        input.put("version",6);
        given().contentType("application/json").body(input).put("/api/v1/inspections/"+id).then().statusCode(409);
        given().get("/api/v1/inspections/"+id+"/audit").then().statusCode(200).body("data.size()",is(4)).body("data.action",everyItem(is("TRANSITION")));
    }
    @Test void idempotentSyncS1S2() throws Exception {
        var input=syncInput(); input.put("items",complete()); input.put("status","SUBMITTED");
        long id=sync(List.of(input)).body("data.results[0].result",is("CREATED")).body("data.results[0].server_version",is(1)).extract().jsonPath().getLong("data.results[0].inspection_id");
        String before=given().get("/api/v1/inspections/"+id).asString();
        var reversed=new ArrayList<>((List<?>)input.get("items")); Collections.reverse(reversed); input.put("items",reversed);
        sync(List.of(input)).body("data.results[0].result",is("DUPLICATE"));
        assertEquals(before,given().get("/api/v1/inspections/"+id).asString());
        given().get("/api/v1/inspections/"+id+"/audit").then().body("data.size()",is(1));
    }
    @Test void updateConflictAndPartialFailureS3S4S5() {
        var input=syncInput(); sync(List.of(input)).body("data.results[0].result",is("CREATED"));
        input.put("base_version",1); input.put("inspector_name","Updated");
        long id=sync(List.of(input)).body("data.results[0].result",is("UPDATED")).body("data.results[0].server_version",is(2)).extract().jsonPath().getLong("data.results[0].inspection_id");
        input.put("inspector_name","Stale");
        sync(List.of(input)).body("data.results[0].result",is("CONFLICT")).body("data.results[0].server_status",is("DRAFT"));
        var invalid=syncInput(); invalid.put("items",List.of(Map.of("point_code","INVALID","condition","GOOD")));
        sync(List.of(invalid,syncInput())).body("data.results.result",contains("REJECTED","CREATED"));
        given().get("/api/v1/inspections/"+id).then().body("data.inspector_name",is("Updated"));
        given().get("/api/v1/inspections/"+id+"/audit").then().body("data.action",contains("SYNC_CREATED","SYNC_UPDATED","SYNC_CONFLICT"));
    }
    @Test void approvedSyncConflictAndDuplicate() throws Exception {
        var input=syncInput(); input.put("items",complete()); input.put("status","SUBMITTED");
        long id=sync(List.of(input)).extract().jsonPath().getLong("data.results[0].inspection_id");
        given().contentType("application/json").body(Map.of("to","APPROVED","actor","boss")).post("/api/v1/inspections/"+id+"/transition").then().statusCode(200);
        input.put("base_version",2); sync(List.of(input)).body("data.results[0].result",is("CONFLICT")).body("data.results[0].server_status",is("APPROVED"));
    }
    @Test void malformedAndPagination() {
        given().contentType("application/json").body("{bad").post("/api/v1/inspections").then().statusCode(400).body("success",is(false));
        given().contentType("application/json").body(Map.of("device_id","test")).post("/api/v1/inspections/sync").then().statusCode(400);
        given().get("/api/v1/inspections?limit=101").then().statusCode(400);
        given().get("/api/v1/inspections?page=bad").then().statusCode(400).body("success",is(false));
        given().get("/api/v1/inspections?status=DRAFT&vehicle_id=1&page=1&limit=2").then().statusCode(200).body("meta.limit",is(2));
        sync(Arrays.asList(null,Map.of("client_id","bad"),syncInput())).body("data.results.result",contains("REJECTED","REJECTED","CREATED"));
    }
}
