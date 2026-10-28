package com.logique.inspection;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import static com.logique.inspection.Api.*;

@Path("/api/v1") @Produces(MediaType.APPLICATION_JSON) @Consumes(MediaType.APPLICATION_JSON)
public class InspectionResource {
    @Inject InspectionService service;
    @Inject SyncService sync;
    @Inject AuditService audit;
    @GET @Path("/vehicles")
    public Object vehicles() { return Envelope.ok(service.vehicles(),"Vehicles retrieved successfully"); }
    @POST @Path("/inspections")
    public Response create(Write input) {
        var detail=service.create(input);
        return Response.status(201).entity(Envelope.ok(detail,"Inspection created successfully")).build();
    }
    @PUT @Path("/inspections/{id}")
    public Object update(@PathParam("id") long id,Write input) { return Envelope.ok(service.update(id,input),"Inspection updated successfully"); }
    @GET @Path("/inspections/{id}")
    public Object detail(@PathParam("id") long id) { return Envelope.ok(service.detail(id),"Inspection retrieved successfully"); }
    @GET @Path("/inspections")
    public Object list(@QueryParam("status") String status,@QueryParam("vehicle_id") Long vehicle,
        @QueryParam("page") @DefaultValue("1") int page,@QueryParam("limit") @DefaultValue("10") int limit) {
        return service.list(status,vehicle,page,limit);
    }
    @POST @Path("/inspections/{id}/transition")
    public Object transition(@PathParam("id") long id,Transition input) { return Envelope.ok(service.transition(id,input),"Status changed successfully"); }
    @POST @Path("/inspections/sync")
    public Object sync(SyncBatch input) { return Envelope.ok(sync.sync(input),"Batch processed successfully"); }
    @GET @Path("/inspections/{id}/audit")
    public Object audit(@PathParam("id") long id) {
        service.detail(id); audit.deliverFor(id);
        return Envelope.ok(audit.history(id),"Audit retrieved successfully");
    }
}
