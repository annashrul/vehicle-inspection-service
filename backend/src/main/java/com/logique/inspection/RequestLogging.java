package com.logique.inspection;

import jakarta.ws.rs.container.*;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;
import org.jboss.logging.MDC;
import java.util.UUID;

@Provider
public class RequestLogging implements ContainerRequestFilter, ContainerResponseFilter {
    private static final Logger LOG=Logger.getLogger(RequestLogging.class);
    public void filter(ContainerRequestContext request) {
        String id=request.getHeaderString("X-Request-ID");
        if (id==null || !id.matches("[a-zA-Z0-9._-]{1,100}")) id=UUID.randomUUID().toString();
        request.setProperty("requestId",id); request.setProperty("started",System.nanoTime()); MDC.put("request_id",id);
    }
    public void filter(ContainerRequestContext request,ContainerResponseContext response) {
        Object id=request.getProperty("requestId"); response.getHeaders().putSingle("X-Request-ID",id);
        LOG.infof("%s %s status=%d duration_ms=%.3f",request.getMethod(),request.getUriInfo().getPath(),response.getStatus(),
            (System.nanoTime()-(long)request.getProperty("started"))/1e6);
        MDC.remove("request_id");
    }
}
