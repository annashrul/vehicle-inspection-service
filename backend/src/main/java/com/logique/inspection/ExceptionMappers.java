package com.logique.inspection;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;
import java.util.List;

public class ExceptionMappers {
    private static final Logger LOG=Logger.getLogger(ExceptionMappers.class);
    @ServerExceptionMapper public Response business(ApiException e) {
        return Response.status(e.status).entity(Api.Envelope.error(e.getMessage(),e.errors)).build();
    }
    @ServerExceptionMapper public Response http(WebApplicationException e) {
        int status=e.getResponse().getStatus();
        return Response.status(status).entity(Api.Envelope.error("Invalid request",List.of(new Api.FieldError("request","Invalid body, path or query parameter")))).build();
    }
    @ServerExceptionMapper public Response malformed(com.fasterxml.jackson.core.JsonProcessingException e) {
        return Response.status(400).entity(Api.Envelope.error("Malformed JSON",List.of(new Api.FieldError("body","Invalid JSON or field type")))).build();
    }
    @ServerExceptionMapper public Response unexpected(Exception e) {
        LOG.error("Unhandled request failure",e);
        return Response.serverError().entity(Api.Envelope.error("Internal server error",List.of())).build();
    }
}
