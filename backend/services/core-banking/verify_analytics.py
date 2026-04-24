from app.infrastructure.database import db_session
from app.services.analytics_service import AnalyticsService

def verify_analytics(user_id):
    with db_session() as session:
        service = AnalyticsService(session, user_id)
        summary = service.get_dashboard_summary()
        print("Dashboard Summary:")
        print(f"  Total Value: {summary['total_value_kobo']}")
        print(f"  Turnover Ratio: {summary['turnover_ratio']}")
        print(f"  Turnover Desc: {summary['turnover_description']}")
        print(f"  Best Sellers: {len(summary['best_sellers'])}")
        for bs in summary['best_sellers']:
            print(f"    - {bs['name']} ({bs['sku']}): {bs['total_sold']}")

if __name__ == "__main__":
    verify_analytics('56dca529-8e72-4ddc-b006-bc8e934bc6b5')
