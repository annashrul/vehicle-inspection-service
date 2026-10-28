package com.logique.inspection;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

@ApplicationScoped
public class AuditDispatcher {
    private static final Logger LOG=Logger.getLogger(AuditDispatcher.class);
    @Inject AuditService audit;
    @Scheduled(every="1s", concurrentExecution=Scheduled.ConcurrentExecution.SKIP)
    void dispatch() {
        try { audit.deliver(); }
        catch (Exception e) { LOG.error("Audit delivery failed; durable outbox will retry",e); }
    }
}
