package com.logique.inspection;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import static com.logique.inspection.Api.*;
import java.util.List;
import org.bson.Document;
import org.jboss.resteasy.reactive.ResponseStatus;
import org.eclipse.microprofile.openapi.annotations.responses.*;
import org.eclipse.microprofile.openapi.annotations.media.*;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;

@APIResponses({
    @APIResponse(responseCode="400",description="Invalid request or business validation",content=@Content(schema=@Schema(implementation=ErrorBody.class))),
    @APIResponse(responseCode="404",description="Vehicle or inspection not found",content=@Content(schema=@Schema(implementation=ErrorBody.class))),
    @APIResponse(responseCode="409",description="Version conflict or illegal transition",content=@Content(schema=@Schema(implementation=ErrorBody.class))),
    @APIResponse(responseCode="500",description="Unexpected infrastructure failure",content=@Content(schema=@Schema(implementation=ErrorBody.class)))
})
@Path("/api/v1") @Produces(MediaType.APPLICATION_JSON) @Consumes(MediaType.APPLICATION_JSON)
public class InspectionResource {
    @Inject InspectionService service;
    @Inject SyncService sync;
    @Inject AuditService audit;
    @GET @Path("/vehicles")
    public Envelope<List<Vehicle>> vehicles() { return Envelope.ok(service.vehicles(),"Vehicles retrieved successfully"); }
    @POST @Path("/inspections")
    @ResponseStatus(201)
    @APIResponse(responseCode="201",description="Draft inspection created",content=@Content(schema=@Schema(ref="#/components/schemas/EnvelopeDetail")))
    public Envelope<Detail> create(Write input) {
        var detail=service.create(input);
        return Envelope.ok(detail,"Inspection created successfully");
    }
    @PUT @Path("/inspections/{id}")
    public Envelope<Detail> update(@PathParam("id") long id,Write input) { return Envelope.ok(service.update(id,input),"Inspection updated successfully"); }
    @GET @Path("/inspections/{id}")
    public Envelope<Detail> detail(@PathParam("id") long id) { return Envelope.ok(service.detail(id),"Inspection retrieved successfully"); }
    @GET @Path("/inspections")
    public Envelope<List<Detail>> list(@QueryParam("status") String status,
        @QueryParam("vehicle_id") @Parameter(schema=@Schema(type=SchemaType.INTEGER,format="int64",minimum="1")) String vehicle,
        @QueryParam("page") @DefaultValue("1") @Parameter(schema=@Schema(type=SchemaType.INTEGER,minimum="1")) String page,
        @QueryParam("limit") @DefaultValue("10") @Parameter(schema=@Schema(type=SchemaType.INTEGER,minimum="1",maximum="100")) String limit) {
        try { return service.list(status,vehicle==null?null:Long.valueOf(vehicle),Integer.parseInt(page),Integer.parseInt(limit)); }
        catch (NumberFormatException e) { throw ApiException.error(400,"pagination","page, limit and vehicle_id must be valid integers"); }
    }
    @POST @Path("/inspections/{id}/transition")
    public Envelope<Detail> transition(@PathParam("id") long id,Transition input) { return Envelope.ok(service.transition(id,input),"Status changed successfully"); }
    @POST @Path("/inspections/sync")
    public Envelope<Results> sync(SyncBatch input) { return Envelope.ok(sync.sync(input),"Batch processed successfully"); }
    @GET @Path("/inspections/{id}/audit")
    public Envelope<List<Document>> audit(@PathParam("id") long id) {
        service.detail(id); audit.deliverFor(id);
        return Envelope.ok(audit.history(id),"Audit retrieved successfully");
    }
}
